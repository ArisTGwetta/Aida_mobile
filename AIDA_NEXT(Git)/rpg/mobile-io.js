/* Selected unchanged Mobile functions, from f3167817; no everyday boot/export/install. */
(function(){'use strict';
window.createStagingMobileIO=function(deps){
const GIS_SRC='https://accounts.google.com/gsi/client';let tokenClient=null,gisLoading=null;
const runtime=()=>deps.runtime,config=()=>deps.config,log=deps.log,fetch=deps.fetch;
const driveFileFromIndex=name=>runtime().drive.fileIndex[name]||null;
async function ensureAllFilesIndexed(){throw Error('Unscoped indexing disabled in staging.');}
// AIDA REVIEW BLOCK 7: Function loadGIS - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 8: Function initTokenClient - callable behavior in this runtime organ.
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
      include_granted_scopes: true,
      callback: handleOAuthResponse
    });

    const rt = runtime();
    rt.boot.phase = "drive_oauth_ready";
    rt.drive.folderId = config().drive?.jsonFolderId || null;
    log("DRIVE: Google OAuth client ready.", "log-blue");
    return tokenClient;
  }

// AIDA REVIEW BLOCK 9: Function handleOAuthResponse - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 10: Function requestDriveToken - callable behavior in this runtime organ.
  async function requestDriveToken() {
    try {
      const client = await initTokenClient();
      log("DRIVE: Requesting Google access token...", "log-amber");
      client.requestAccessToken({ prompt: "" });
    } catch (error) {
      log(`DRIVE: ${error.message}`, "log-amber");
    }
  }


  async function readDriveResponse(url, options, label, bodyType) {
    const controller = options.readTimeoutMs ? new AbortController() : null;
    const signal = controller?.signal || options.signal;
    let timer;
    let cancel;
    let aborted = false;
    try {
      options.onRequest?.(label);
      const cancellation = new Promise((_, reject) => {
        cancel = () => {
          aborted = true;
          reject(new Error(label + " was cancelled. Conversation retained."));
          controller?.abort();
        };
        if (options.signal?.aborted) cancel();
        else options.signal?.addEventListener("abort", cancel, { once: true });
        if (options.readTimeoutMs) timer = setTimeout(() => {
          aborted = true;
          reject(new Error(label + " timed out after " + (options.readTimeoutMs / 1000) + " seconds. No partial capture will be saved."));
          controller.abort();
        }, options.readTimeoutMs);
      });
      if (aborted) return await cancellation;
      const request = (async () => {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${runtime().tokens.drive.accessToken}` }, signal
        });
        if (!response.ok) throw new Error(label + ": HTTP " + response.status + ".");
        return bodyType === "json" ? response.json() : response.text();
      })();
      return await Promise.race([request, cancellation]);
    } catch (error) {
      if (aborted) throw error;
      throw new Error(label + " failed: " + error.message);
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", cancel);
      controller?.abort();
    }
  }

  async function listDriveFilesPage(pageToken = null, options = {}) {
    const rt = runtime();
    const token = rt.tokens.drive.accessToken;
    const folderId = rt.drive.folderId;

    if (!token) throw new Error("Drive access token is missing.");
    if (!folderId) throw new Error("Drive JSON folder ID is missing.");

    const query = encodeURIComponent(options.query || `'${folderId}' in parents and trashed = false`);
    const pageSize = encodeURIComponent(String(options.pageSize || 1000));
    const fields = encodeURIComponent("nextPageToken,files(id,name,mimeType,modifiedTime)");
    const tokenPart = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=${pageSize}&fields=${fields}${tokenPart}`;
    const label = (options.progressLabel || "Drive listing") + " — page " + (options.pageNumber || 1);
    const data = await readDriveResponse(url, options, label, "json");
    return {
      files: data.files || [],
      nextPageToken: data.nextPageToken || null
    };
  }

  async function listDriveFiles(options = {}) {
    const files = [];
    let pageToken = null;
    let pageCount = 0;
    do {
      const page = await listDriveFilesPage(pageToken, { ...options, pageNumber: pageCount + 1 });
      files.push(...page.files);
      pageToken = page.nextPageToken;
      pageCount += 1;
    } while (pageToken);
    runtime().drive.lastListPageCount = pageCount;
    return files;
  }


async function fetchJsonFile(file, options = {}) {
  const token = runtime().tokens.drive.accessToken;
  const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;

  const label = options.progressLabel || ("Reading " + file.name);
  const raw = await readDriveResponse(url, options, label, "text");

  try {
    // Remove BOM if present
    const clean = raw.replace(/^\uFEFF/, "");
    return JSON.parse(clean);
  } catch (err) {
    throw new Error(`JSON parse failed for ${file.name}: ${err.message}`);
  }
}



  async function putFile(name, content, mimeType = "application/octet-stream") {
    const rt = runtime();
    if (!rt.tokens?.drive?.accessToken) throw new Error("Drive access token is missing.");
    if (!rt.drive?.folderId) throw new Error("Drive folder ID is missing.");
    if (!Object.keys(rt.drive?.fileIndex || {}).length) await ensureAllFilesIndexed();
    const existing = driveFileFromIndex(name);
    const body = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    let response;
    if (existing?.id) {
      response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media&fields=id,name,mimeType,modifiedTime`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${rt.tokens.drive.accessToken}`,
          "Content-Type": mimeType
        },
        body
      });
    } else {
      const boundary = `aida_asset_${Date.now()}`;
      const metadata = JSON.stringify({
        name,
        mimeType,
        parents: [rt.drive.folderId]
      });
      const multipart = new Blob([
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
        body,
        `\r\n--${boundary}--\r\n`
      ], { type: `multipart/related; boundary=${boundary}` });
      response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rt.tokens.drive.accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`
        },
        body: multipart
      });
    }
    if (!response.ok) throw new Error(`Drive upload failed for ${name}: HTTP ${response.status}.`);
    const saved = await response.json();
    rt.drive.fileIndex[name] = {
      id: saved.id || existing?.id,
      name: saved.name || name,
      mimeType: saved.mimeType || mimeType,
      modifiedTime: saved.modifiedTime || new Date().toISOString()
    };
    return rt.drive.fileIndex[name];
  }


  async function fetchJsonByName(name, reason = "lazy_fetch") {
    const rt = runtime();
    if (rt.drive.files?.[name]) return rt.drive.files[name];

    const file = driveFileFromIndex(name);
    if (!file) {
      throw new Error(`Drive file ${name} is not indexed.`);
    }

    const data = await fetchJsonFile(file);
    rt.drive.files[name] = data;
    rt.drive.loadedNames = Array.from(new Set([...(rt.drive.loadedNames || []), name]));
    rt.drive.deferredNames = (rt.drive.deferredNames || []).filter((fileName) => fileName !== name);
    log(`DRIVE: Loaded ${name} (${reason}).`);
    return data;
  }


return {initTokenClient,requestDriveToken,listDriveFiles,putFile,fetchJsonByName};};})();
