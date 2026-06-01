(function () {
  const MODULE_ID = "spine.drive.oauth";
  const GIS_SRC = "https://accounts.google.com/gsi/client";

  let tokenClient = null;
  let gisLoading = null;

  function $(id) {
    return document.getElementById(id);
  }

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function config() {
    return window.AIDA_CONFIG || {};
  }

  function log(message, className = "log-green") {
    const logs = $("bios-logs");
    if (logs) {
      const line = document.createElement("div");
      line.className = className;
      line.textContent = `>>> ${message}`;
      logs.appendChild(line);
      logs.scrollTop = logs.scrollHeight;
    }

    if (window.AIDA_BODY?.pulse) {
      window.AIDA_BODY.pulse(message);
    }
  }

  function loadGIS() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    if (gisLoading) return gisLoading;

    gisLoading = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Google Identity Services failed to load."));
      document.head.appendChild(script);
    });

    return gisLoading;
  }

  async function initTokenClient() {
    await loadGIS();

    if (tokenClient) return tokenClient;

    const googleConfig = config().google || {};
    if (!googleConfig.clientId) {
      throw new Error("Missing Google OAuth client ID in AIDA_CONFIG.google.clientId.");
    }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: googleConfig.clientId,
      scope: (googleConfig.scopes || []).join(" "),
      callback: handleOAuthResponse
    });

    const rt = runtime();
    rt.boot.phase = "drive_oauth_ready";
    rt.drive.folderId = config().drive?.jsonFolderId || null;
    log("DRIVE: Google OAuth client ready.", "log-blue");
    return tokenClient;
  }

  function handleOAuthResponse(response) {
    if (!response || !response.access_token) {
      log("DRIVE: OAuth failed or was cancelled.", "log-amber");
      return;
    }

    const rt = runtime();
    rt.tokens.drive.accessToken = response.access_token;
    rt.tokens.drive.source = "google_oauth";
    rt.boot.driveConnected = true;
    rt.boot.phase = "drive_connected";
    rt.drive.folderId = config().drive?.jsonFolderId || rt.drive.folderId;

    log("DRIVE: OAuth cleared. Drive token stored in runtime.", "log-blue");
  }

  async function requestDriveToken() {
    try {
      const client = await initTokenClient();
      log("DRIVE: Requesting Google access token...", "log-amber");
      client.requestAccessToken({ prompt: "" });
    } catch (error) {
      log(`DRIVE: ${error.message}`, "log-amber");
    }
  }

  async function listJsonFiles() {
    const rt = runtime();
    const token = rt.tokens.drive.accessToken;
    const folderId = rt.drive.folderId;

    if (!token) throw new Error("Drive access token is missing.");
    if (!folderId) throw new Error("Drive JSON folder ID is missing.");

    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime)`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Drive list failed with HTTP ${response.status}.`);
    }

    const data = await response.json();
    return (data.files || []).filter((file) => file.name.endsWith(".json"));
  }

  async function smokeListDriveJson() {
    try {
      const files = await listJsonFiles();
      const rt = runtime();
      rt.boot.phase = "drive_listed";
      rt.drive.lastList = files.map((file) => ({
        id: file.id,
        name: file.name,
        modifiedTime: file.modifiedTime
      }));
      log(`DRIVE: Found ${files.length} JSON files in private folder.`, "log-blue");
      return files;
    } catch (error) {
      log(`DRIVE: ${error.message}`, "log-amber");
      return [];
    }
  }

  function install() {
    const connect = $("drive-connect-btn");
    const list = $("drive-list-btn");

    if (connect) connect.addEventListener("click", requestDriveToken);
    if (list) list.addEventListener("click", smokeListDriveJson);

    const rt = runtime();
    rt.drive.folderId = config().drive?.jsonFolderId || null;
    initTokenClient().catch((error) => {
      log(`DRIVE: ${error.message}`, "log-amber");
    });
  }

  window.AIDA_DRIVE = {
    initTokenClient,
    requestDriveToken,
    listJsonFiles,
    smokeListDriveJson
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "drive_handshake",
      reads: ["AIDA_CONFIG.google.clientId", "AIDA_CONFIG.drive.jsonFolderId"],
      writes: ["AIDA_RUNTIME.tokens.drive.accessToken", "AIDA_RUNTIME.boot.driveConnected"],
      requires: ["AIDA_RUNTIME"],
      verifies: ["Google OAuth token is stored only in AIDA_RUNTIME.tokens.drive.accessToken"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
