// AIDA REVIEW BLOCK 1: File header - AIDA_ONE_SPINE\spine\drive_oauth.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
(function () {
  const MODULE_ID = "spine.drive.oauth";
  const GIS_SRC = "https://accounts.google.com/gsi/client";
  const CORE_BOOT_JSON = new Set([
    "core_identity.json",
    "global_identity.json",
    "global_briefcase.json",
    "memory_summary.json",
    "facts.json",
    "facts_candidates.json",
    "insights.json",
    "insights_candidates.json",
    "emotion_state.json",
    "session_log.json",
    "recent_turns.json",
    "while_away_thoughts.json",
    "openai_fragments.json",
    "llm_fragments.json",
    "project_summary.json",
    "project_briefcases.json",
    "face_map.json",
    "emotion_coordinates.json"
  ]);
  const DEFAULT_CONTEXT_FILES = [
    "realm_aida_architecture.json",
    "project_briefcase_aida_architecture.json",
    "briefcase_aida_architecture.json",
    "project_aida_architecture.json"
  ];

  let tokenClient = null;
  let gisLoading = null;

// AIDA REVIEW BLOCK 3: Function $ - callable behavior in this runtime organ.
  function $(id) {
    return document.getElementById(id);
  }

// AIDA REVIEW BLOCK 4: Function runtime - callable behavior in this runtime organ.
  function runtime() {
    return window.AIDA_RUNTIME;
  }

const rt = runtime();
rt.context = rt.context || {};
rt.mind = rt.mind || {};
rt.session = rt.session || {};
rt.drive = rt.drive || {};
rt.boot = rt.boot || {};

log(`ORGAN LOAD: ${MODULE_ID}`, "log-white");

// AIDA REVIEW BLOCK 5: Function config - callable behavior in this runtime organ.
  function config() {
    return window.AIDA_CONFIG || {};
  }

// AIDA REVIEW BLOCK 6: Function log - callable behavior in this runtime organ.
  function log(message, className = "log-green") {
    if (window.AIDA_BIOS?.log) {
      window.AIDA_BIOS.log(message, className);
      return;
    }

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

// AIDA REVIEW BLOCK 11: Function listDriveFiles - callable behavior in this runtime organ.
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
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Drive list failed with HTTP ${response.status}.`);
    }

    const data = await response.json();
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
      const page = await listDriveFilesPage(pageToken, options);
      files.push(...page.files);
      pageToken = page.nextPageToken;
      pageCount += 1;
    } while (pageToken);
    runtime().drive.lastListPageCount = pageCount;
    return files;
  }

// AIDA REVIEW BLOCK 12: Function listJsonFiles - callable behavior in this runtime organ.
  async function listJsonFiles() {
    return (await listDriveFiles()).filter((file) => file.name.endsWith(".json"));
  }

// AIDA REVIEW BLOCK 13: Function fetchJsonFile - callable behavior in this runtime organ.
// AIDA PATCH: MIME‑agnostic JSON loader for Google Drive
async function fetchJsonFile(file) {
  const token = runtime().tokens.drive.accessToken;
  const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Fetch failed for ${file.name}: HTTP ${response.status}.`);
  }

  // Read raw text instead of relying on MIME type
  const raw = await response.text();

  try {
    // Remove BOM if present
    const clean = raw.replace(/^\uFEFF/, "");
    return JSON.parse(clean);
  } catch (err) {
    throw new Error(`JSON parse failed for ${file.name}: ${err.message}`);
  }
}


// AIDA REVIEW BLOCK 14: Function isProjectFile - callable behavior in this runtime organ.
  function isProjectFile(name) {
    return (
      name !== "project_summary.json" &&
      name !== "project_briefcases.json" &&
      (
        name.startsWith("project_") ||
        name.startsWith("briefcase_") ||
        name.startsWith("project_briefcase_")
      )
    );
  }

// AIDA REVIEW BLOCK 15: Function isRealmFile - callable behavior in this runtime organ.
  function isRealmFile(name) {
    return name.startsWith("realm_") || name.startsWith("REALM_");
  }

// AIDA REVIEW BLOCK 16: Function isRoleFile - callable behavior in this runtime organ.
  function isRoleFile(name) {
    return name.startsWith("role_");
  }

// AIDA REVIEW BLOCK 17: Function isCoreBootFile - callable behavior in this runtime organ.
  function isCoreBootFile(name) {
    return CORE_BOOT_JSON.has(name) || isRoleFile(name) || DEFAULT_CONTEXT_FILES.includes(name);
  }

// AIDA REVIEW BLOCK 18: Function indexDriveFiles - callable behavior in this runtime organ.
  function indexDriveFiles(files) {
    const rt = runtime();
    rt.drive.fileIndex = {};
    files.forEach((file) => {
      rt.drive.fileIndex[file.name] = {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime
      };
    });
    rt.drive.lastList = files.map((file) => ({
      id: file.id,
      name: file.name,
      modifiedTime: file.modifiedTime
    }));
    return rt.drive.fileIndex;
  }

// AIDA REVIEW BLOCK 19: Function driveFileFromIndex - callable behavior in this runtime organ.
  function driveFileFromIndex(name) {
    const entry = runtime().drive?.fileIndex?.[name] || null;
    if (!entry?.id) return null;
    return entry;
  }

// AIDA REVIEW BLOCK 20: Function ensureAssetCache - callable behavior in this runtime organ.
  function ensureAssetCache() {
    const rt = runtime();
    rt.drive.assetUrls = rt.drive.assetUrls || {};
    return rt.drive.assetUrls;
  }

// AIDA REVIEW BLOCK 21: Function cachedBlobUrl - callable behavior in this runtime organ.
  function cachedBlobUrl(name) {
    return ensureAssetCache()[name] || null;
  }

// AIDA REVIEW BLOCK 22: Function ensureAllFilesIndexed - callable behavior in this runtime organ.
  async function ensureAllFilesIndexed() {
    const files = await listDriveFiles();
    indexDriveFiles(files);
    return files;
  }

// AIDA REVIEW BLOCK 23: Function fetchBlobUrlByName - callable behavior in this runtime organ.
  async function fetchBlobUrlByName(name) {
    const cached = cachedBlobUrl(name);
    if (cached) return cached;
    let file = driveFileFromIndex(name);
    if (!file) {
      await ensureAllFilesIndexed();
      file = driveFileFromIndex(name);
    }
    if (!file) throw new Error(`Drive asset ${name} is not indexed.`);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
      headers: { Authorization: `Bearer ${runtime().tokens.drive.accessToken}` }
    });
    if (!response.ok) throw new Error(`Asset fetch failed for ${name}: HTTP ${response.status}.`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    ensureAssetCache()[name] = url;
    return url;
  }

// AIDA REVIEW BLOCK 24: Function putFile - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 25: Function fetchJsonByName - callable behavior in this runtime organ.
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

  const CONTINUITY_RECENT_FOLDER_NAME = "continuity_recent";
  const CONTINUITY_RECENT_MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

  function continuityHash(value) {
    const text = String(value || "");
    let hash = 5381;
    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) + hash) ^ text.charCodeAt(index);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function continuitySafeStamp(value) {
    return String(value || new Date().toISOString()).replace(/[-:.TZ]/g, "").slice(0, 14);
  }

  function continuityReceivedAt() {
    return new Date().toISOString();
  }

  function sharedRecentConfig() {
    const cfg = config().sharedRecent || {};
    return {
      automaticWritesEnabled: cfg.automaticWritesEnabled === true,
      promptInsertionEnabled: cfg.promptInsertionEnabled === true,
      promptLimit: Number.isFinite(Number(cfg.promptLimit)) ? Math.max(1, Number(cfg.promptLimit)) : 6
    };
  }

  function formatContinuityRecentRecord(exchange, options = {}) {
    const hostId = options.hostId || "phone";
    const conversationId = options.conversationId || exchange?.tags?.session_id || runtime()?.session?.id || "unknown_conversation";
    const capturedAt = exchange?.capturedAt || continuityReceivedAt();
    const receivedAt = options.receivedAt || continuityReceivedAt();
    const clockSkewMs = Math.abs(new Date(capturedAt).getTime() - new Date(receivedAt).getTime());
    const clockSuspect = Number.isFinite(clockSkewMs) && clockSkewMs > (options.maxClockSkewMs || CONTINUITY_RECENT_MAX_CLOCK_SKEW_MS);
    const effectiveAt = clockSuspect ? receivedAt : capturedAt;
    const userText = String(exchange?.user?.text || "");
    const aidaText = String(exchange?.aida?.text || "");
    const dedupeKey = continuityHash([hostId, conversationId, userText.trim(), aidaText.trim()].join("|"));
    const sequence = exchange?.turnIndex || options.sequence || 1;
    const turnId = `${hostId}:${conversationId}:${sequence}:${dedupeKey}`;
    return {
      version: 1,
      turn_id: turnId,
      conversation_id: conversationId,
      host_id: hostId,
      source_host: hostId,
      captured_at: capturedAt,
      received_at: receivedAt,
      effective_at: effectiveAt,
      clock_suspect: Boolean(clockSuspect),
      clock_skew_ms: Number.isFinite(clockSkewMs) ? clockSkewMs : null,
      sequence,
      status: options.status || exchange?.status || "completed_model_reply",
      user: { text: userText },
      aida: { text: aidaText },
      context: exchange?.context || {},
      dedupe_key: dedupeKey
    };
  }

  function continuityRecentFileName(record) {
    return `turn_${continuitySafeStamp(record.effective_at)}_${record.host_id}_${record.dedupe_key}.json`;
  }

  function continuityRecentFolderIdFromConfig() {
    return config().drive?.continuityRecentFolderId || runtime().drive?.continuityRecentFolderId || null;
  }

  async function resolveContinuityRecentFolderId() {
    const rt = runtime();
    if (!rt.tokens?.drive?.accessToken) throw new Error("Drive access token is missing.");
    if (!rt.drive?.folderId) throw new Error("Drive JSON folder ID is missing.");
    const configured = continuityRecentFolderIdFromConfig();
    if (configured) {
      rt.drive.continuityRecentFolderId = configured;
      return configured;
    }
    const escapedName = CONTINUITY_RECENT_FOLDER_NAME.replace(/'/g, "\\'");
    const query = `'${rt.drive.folderId}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const folders = await listDriveFiles({ query, pageSize: 10 });
    if (!folders.length) {
      throw new Error(`Drive continuity_recent folder was not found under configured JSON folder ${rt.drive.folderId}.`);
    }
    if (folders.length > 1) {
      throw new Error(`Multiple Drive continuity_recent folders found under configured JSON folder ${rt.drive.folderId}; set AIDA_CONFIG.drive.continuityRecentFolderId.`);
    }
    rt.drive.continuityRecentFolderId = folders[0].id;
    return folders[0].id;
  }

  async function createContinuityRecentFileOnce(name, record) {
    const rt = runtime();
    if (!rt.tokens?.drive?.accessToken) throw new Error("Drive access token is missing.");
    const folderId = await resolveContinuityRecentFolderId();
    const existing = (await listContinuityRecentFiles()).find((file) => file.name === name);
    if (existing?.id) {
      const error = new Error(`Shared RECENT record already exists: ${name}`);
      error.code = "shared_recent_record_exists";
      error.collisionPrevented = true;
      throw error;
    }
    const mimeType = "application/json";
    const boundary = `aida_recent_${Date.now()}`;
    const metadata = JSON.stringify({
      name,
      mimeType,
      parents: [folderId]
    });
    const body = new Blob([JSON.stringify(record, null, 2), "\n"], { type: mimeType });
    const multipart = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
      body,
      `\r\n--${boundary}--\r\n`
    ], { type: `multipart/related; boundary=${boundary}` });
    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rt.tokens.drive.accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: multipart
    });
    if (!response.ok) throw new Error(`Shared RECENT create failed for ${name}: HTTP ${response.status}.`);
    const saved = await response.json();
    rt.drive.continuityRecentFileIndex = rt.drive.continuityRecentFileIndex || {};
    rt.drive.continuityRecentFileIndex[name] = {
      id: saved.id,
      name: saved.name || name,
      mimeType: saved.mimeType || mimeType,
      modifiedTime: saved.modifiedTime || new Date().toISOString()
    };
    return rt.drive.continuityRecentFileIndex[name];
  }

  async function writeContinuityRecentCanary(options = {}) {
    const marker = options.marker || continuityHash(`${Date.now()}|${Math.random()}`);
    const record = formatContinuityRecentRecord({
      capturedAt: options.capturedAt || continuityReceivedAt(),
      turnIndex: 1,
      status: "canary_shared_recent_bridge_test",
      user: { text: `CANARY_FROM_PHONE_${marker}` },
      aida: { text: `ACK_CANARY_FROM_PHONE_${marker}` },
      context: { prototype: "shared_recent_bridge", model_prompt_insertion_enabled: false }
    }, {
      hostId: options.hostId || "phone",
      conversationId: options.conversationId || `shared-recent-canary-${marker}`,
      sequence: 1,
      status: "canary_shared_recent_bridge_test"
    });
    const name = options.fileName || continuityRecentFileName(record);
    try {
      const file = await createContinuityRecentFileOnce(name, record);
      return {
        ok: true,
        created: true,
        collision_prevented: null,
        drive_file_id: file.id,
        drive_name: file.name,
        record
      };
    } catch (error) {
      if (error?.collisionPrevented) {
        return {
          ok: false,
          created: false,
          collision_prevented: true,
          drive_name: name,
          error: error.code || "shared_recent_record_exists"
        };
      }
      throw error;
    }
  }

  function isDiagnosticContinuityRecentRecord(record) {
    return String(record?.status || "").includes("canary") ||
      String(record?.context?.prototype || "").includes("shared_recent_bridge");
  }

  async function writeContinuityRecentExchange(exchange, options = {}) {
    const cfg = sharedRecentConfig();
    if (!cfg.automaticWritesEnabled && options.force !== true) {
      return { ok: false, skipped: true, reason: "shared_recent_writes_disabled" };
    }
    const record = formatContinuityRecentRecord(exchange, {
      hostId: options.hostId || "phone",
      status: exchange?.status || "completed_model_reply"
    });
    if (isDiagnosticContinuityRecentRecord(record)) {
      return { ok: false, skipped: true, reason: "diagnostic_record_excluded" };
    }
    const rt = runtime();
    rt.drive.sharedRecentWrittenTurnIds = rt.drive.sharedRecentWrittenTurnIds || {};
    if (rt.drive.sharedRecentWrittenTurnIds[record.turn_id]) {
      return { ok: true, skipped: true, reason: "already_written", turn_id: record.turn_id };
    }
    const name = continuityRecentFileName(record);
    try {
      const file = await createContinuityRecentFileOnce(name, record);
      rt.drive.sharedRecentWrittenTurnIds[record.turn_id] = file.id || true;
      return {
        ok: true,
        created: true,
        drive_file_id: file.id,
        drive_name: file.name,
        turn_id: record.turn_id,
        record
      };
    } catch (error) {
      if (error?.collisionPrevented) {
        rt.drive.sharedRecentWrittenTurnIds[record.turn_id] = true;
        return {
          ok: true,
          created: false,
          collision_prevented: true,
          drive_name: name,
          turn_id: record.turn_id,
          error: error.code || "shared_recent_record_exists"
        };
      }
      throw error;
    }
  }

  function selectContinuityRecentWindow(records, limit = 8) {
    const byDedupe = new Map();
    (records || []).filter((record) => record?.version === 1 && record?.dedupe_key).forEach((record) => {
      const prior = byDedupe.get(record.dedupe_key);
      if (!prior || String(record.received_at || "") > String(prior.received_at || "")) {
        byDedupe.set(record.dedupe_key, record);
      }
    });
    return Array.from(byDedupe.values())
      .sort((a, b) => (
        String(a.effective_at || "").localeCompare(String(b.effective_at || "")) ||
        String(a.received_at || "").localeCompare(String(b.received_at || "")) ||
        String(a.turn_id || "").localeCompare(String(b.turn_id || ""))
      ))
      .slice(-limit);
  }

  async function listContinuityRecentFiles() {
    const folderId = await resolveContinuityRecentFolderId();
    const query = `'${folderId}' in parents and trashed = false`;
    const files = (await listDriveFiles({ query }))
      .filter((file) => String(file.name || "").startsWith("turn_") && String(file.name || "").endsWith(".json"));
    const rt = runtime();
    rt.drive.continuityRecentFileIndex = {};
    files.forEach((file) => {
      rt.drive.continuityRecentFileIndex[file.name] = {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime
      };
    });
    return files;
  }

  function validateContinuityRecentRecord(record) {
    const issues = [];
    if (!record || typeof record !== "object") {
      return { valid: false, issues: ["record_not_object"] };
    }
    if (record.version !== 1) issues.push("unsupported_version");
    if (!record.turn_id) issues.push("missing_turn_id");
    if (!record.conversation_id) issues.push("missing_conversation_id");
    if (!record.host_id) issues.push("missing_host_id");
    if (!record.dedupe_key) issues.push("missing_dedupe_key");
    if (!record.captured_at) issues.push("missing_captured_at");
    if (!record.received_at) issues.push("missing_received_at");
    if (!record.effective_at) issues.push("missing_effective_at");
    if (typeof record.user?.text !== "string") issues.push("missing_user_text");
    if (typeof record.aida?.text !== "string") issues.push("missing_aida_text");
    return { valid: issues.length === 0, issues };
  }

  function redactContinuityRecentRecord(record, file, options = {}) {
    const includeText = options.includeText === true;
    const validation = validateContinuityRecentRecord(record);
    const fileModifiedTime = file?.modifiedTime || null;
    const capturedAt = record?.captured_at || null;
    const receivedAt = fileModifiedTime || record?.received_at || null;
    const clockSkewMs = capturedAt && receivedAt
      ? Math.abs(new Date(capturedAt).getTime() - new Date(receivedAt).getTime())
      : null;
    const clockSuspect = Number.isFinite(clockSkewMs) && clockSkewMs > CONTINUITY_RECENT_MAX_CLOCK_SKEW_MS;
    const summary = {
      drive_file_id: file?.id || null,
      drive_name: file?.name || null,
      drive_modifiedTime: fileModifiedTime,
      modified_time_source: "google_drive_file_metadata",
      record_valid: validation.valid,
      validation_issues: validation.issues,
      turn_id: record?.turn_id || null,
      conversation_id: record?.conversation_id || null,
      host_id: record?.host_id || null,
      source_host: record?.source_host || null,
      captured_at: capturedAt,
      record_received_at: record?.received_at || null,
      effective_at: clockSuspect && fileModifiedTime ? fileModifiedTime : (record?.effective_at || fileModifiedTime),
      clock_suspect: Boolean(clockSuspect || record?.clock_suspect),
      clock_skew_ms: Number.isFinite(clockSkewMs) ? clockSkewMs : (record?.clock_skew_ms || null),
      sequence: record?.sequence || null,
      status: record?.status || null,
      dedupe_key: record?.dedupe_key || null,
      text_redacted: !includeText,
      user_text_present: typeof record?.user?.text === "string",
      user_text_length: typeof record?.user?.text === "string" ? record.user.text.length : 0,
      aida_text_present: typeof record?.aida?.text === "string",
      aida_text_length: typeof record?.aida?.text === "string" ? record.aida.text.length : 0
    };
    if (includeText) {
      summary.user_text = record?.user?.text || "";
      summary.aida_text = record?.aida?.text || "";
    }
    return summary;
  }

  function selectContinuityRecentInspectionWindow(recordSummaries, limit = 8) {
    const dedupeDecisions = [];
    const byDedupe = new Map();
    (recordSummaries || []).forEach((summary) => {
      if (!summary.record_valid || !summary.dedupe_key) {
        dedupeDecisions.push({
          drive_file_id: summary.drive_file_id,
          drive_name: summary.drive_name,
          decision: "excluded_invalid",
          reason: (summary.validation_issues || []).join(",") || "invalid_record"
        });
        return;
      }
      const prior = byDedupe.get(summary.dedupe_key);
      const currentTime = String(summary.drive_modifiedTime || summary.record_received_at || summary.effective_at || "");
      const priorTime = prior ? String(prior.drive_modifiedTime || prior.record_received_at || prior.effective_at || "") : "";
      if (!prior || currentTime > priorTime) {
        if (prior) {
          dedupeDecisions.push({
            drive_file_id: prior.drive_file_id,
            drive_name: prior.drive_name,
            dedupe_key: prior.dedupe_key,
            decision: "excluded_duplicate_older",
            kept_drive_file_id: summary.drive_file_id
          });
        }
        byDedupe.set(summary.dedupe_key, summary);
      } else {
        dedupeDecisions.push({
          drive_file_id: summary.drive_file_id,
          drive_name: summary.drive_name,
          dedupe_key: summary.dedupe_key,
          decision: "excluded_duplicate_older",
          kept_drive_file_id: prior.drive_file_id
        });
      }
    });
    const selected = Array.from(byDedupe.values())
      .sort((a, b) => (
        String(a.effective_at || "").localeCompare(String(b.effective_at || "")) ||
        String(a.drive_modifiedTime || "").localeCompare(String(b.drive_modifiedTime || "")) ||
        String(a.turn_id || "").localeCompare(String(b.turn_id || ""))
      ))
      .slice(-limit);
    selected.forEach((summary) => {
      dedupeDecisions.push({
        drive_file_id: summary.drive_file_id,
        drive_name: summary.drive_name,
        dedupe_key: summary.dedupe_key,
        decision: "selected"
      });
    });
    return { selected, dedupeDecisions };
  }

  async function inspectContinuityRecent(options = {}) {
    const limit = options.limit || 8;
    const cfg = sharedRecentConfig();
    const partialFailures = [];
    const report = {
      inspector: "git_mobile_drive_continuity_recent",
      read_only: true,
      model_prompt_insertion_enabled: cfg.promptInsertionEnabled,
      shared_writes_enabled: cfg.automaticWritesEnabled,
      manual_canary_writer_available: true,
      folder_name: CONTINUITY_RECENT_FOLDER_NAME,
      folder_id: null,
      representation: "unknown",
      immutable_retry_check: {
        current_putFile_create_once: false,
        manual_canary_create_once_enabled: true,
        same_name_retry_can_overwrite: false,
        evidence: "Shared RECENT writers use createContinuityRecentFileOnce(), which lists the real continuity_recent folder and refuses a same-name record before upload."
      },
      files_listed_count: 0,
      records_fetched_count: 0,
      page_count: null,
      files: [],
      selected_window: [],
      dedupe_decisions: [],
      partial_failures: partialFailures
    };
    let files = [];
    try {
      files = await listContinuityRecentFiles();
      report.folder_id = runtime().drive?.continuityRecentFolderId || continuityRecentFolderIdFromConfig();
      report.files_listed_count = files.length;
      report.page_count = runtime().drive?.lastListPageCount || null;
      report.representation = "drive_child_folder";
    } catch (error) {
      partialFailures.push({ phase: "list", message: error.message });
      return report;
    }
    for (const file of files) {
      try {
        const record = await fetchJsonFile(file);
        const summary = redactContinuityRecentRecord(record, file, options);
        report.files.push(summary);
        report.records_fetched_count += 1;
      } catch (error) {
        partialFailures.push({
          phase: "fetch_or_parse",
          drive_file_id: file?.id || null,
          drive_name: file?.name || null,
          drive_modifiedTime: file?.modifiedTime || null,
          message: error.message
        });
      }
    }
    const windowResult = selectContinuityRecentInspectionWindow(report.files, limit);
    report.selected_window = windowResult.selected;
    report.dedupe_decisions = windowResult.dedupeDecisions;
    return report;
  }

  async function loadContinuityRecentPromptContext(options = {}) {
    const cfg = sharedRecentConfig();
    if (!cfg.promptInsertionEnabled && options.force !== true) {
      runtime().context.sharedRecentPrompt = "";
      return { ok: false, skipped: true, reason: "shared_recent_prompt_disabled", prompt: "" };
    }
    const limit = options.limit || cfg.promptLimit;
    const files = await listContinuityRecentFiles();
    const records = [];
    for (const file of files) {
      try {
        const record = await fetchJsonFile(file);
        const validation = validateContinuityRecentRecord(record);
        if (!validation.valid || isDiagnosticContinuityRecentRecord(record)) continue;
        records.push({ ...record, drive_name: file.name, drive_modifiedTime: file.modifiedTime || null });
      } catch (error) {
        log(`SHARED RECENT: Skipped ${file?.name || "record"} for prompt context: ${error.message}`, "log-amber");
      }
    }
    const selected = selectContinuityRecentWindow(records, limit);
    const prompt = selected.length
      ? [
          "Shared recent conversation from Aida's other environment. Use this only as recent conversational context; do not treat it as durable memory:",
          ...selected.map((record) => [
            `- ${record.effective_at || record.captured_at || "unknown_time"} [${record.host_id || "unknown_host"}]`,
            `Francisco: ${String(record.user?.text || "").trim()}`,
            `Aida: ${String(record.aida?.text || "").trim()}`
          ].join(" "))
        ].join("\n")
      : "";
    runtime().context.sharedRecentPrompt = prompt;
    runtime().context.sharedRecentPromptRecords = selected.map((record) => ({
      turn_id: record.turn_id,
      host_id: record.host_id,
      effective_at: record.effective_at,
      drive_name: record.drive_name || null
    }));
    return { ok: true, prompt, records: runtime().context.sharedRecentPromptRecords };
  }

// AIDA REVIEW BLOCK 26: Function likelyContextFileNames - callable behavior in this runtime organ.
  function likelyContextFileNames(projectName) {
    const raw = String(projectName || "").replace(/\.json$/i, "");
    const clean = raw
      .toLowerCase()
      .replace(/^realm_/, "")
      .replace(/^project_briefcase_/, "")
      .replace(/^briefcase_/, "")
      .replace(/^project_/, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    return [
      projectName,
      `${raw}.json`,
      `realm_${clean}.json`,
      `REALM_${clean}.json`,
      `project_briefcase_${clean}.json`,
      `briefcase_${clean}.json`,
      `project_${clean}.json`
    ].filter(Boolean);
  }

// AIDA REVIEW BLOCK 27: Function findIndexedContextFile - callable behavior in this runtime organ.
  function findIndexedContextFile(projectName) {
    const rt = runtime();
    const ledger = rt.mind?.projectLedger || {};
    const wanted = String(projectName || "");
    const normalizedWanted = wanted
      .replace(/\.json$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_");
    const ledgerEntry = ledger[projectName] || Object.values(ledger).find((entry) => {
      const names = [
        entry?.key,
        entry?.fileName,
        entry?.name,
        entry?.summary?.fileName,
        entry?.summary?.filename,
        entry?.summary?.briefcase_filename
      ].filter(Boolean).map(String);
      return names.some((name) => (
        name === wanted ||
        name.replace(/\.json$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "_") === normalizedWanted
      ));
    }) || null;
    const candidates = [
      projectName,
      ledgerEntry?.fileName,
      ledgerEntry?.summary?.fileName,
      ledgerEntry?.summary?.filename,
      ledgerEntry?.summary?.briefcase_filename,
      ledgerEntry?.summary?.realm_file,
      ledgerEntry?.summary?.realm_source,
      ...likelyContextFileNames(projectName)
    ].filter(Boolean).map(String);

    return candidates.find((name) => rt.drive?.fileIndex?.[name]) || null;
  }

// AIDA REVIEW BLOCK 28: Function valueName - callable behavior in this runtime organ.
  function valueName(value, fallback = "unnamed") {
    if (!value || typeof value !== "object") return fallback;

// AIDA REVIEW BLOCK 29: Function direct - arrow-function behavior in this runtime organ.
    const direct = (
      value.project_name ||
      value.briefcase_title ||
      value.briefcase_name ||
      value.display_name ||
      value.displayName ||
      value.name ||
      value.title ||
      value.realm ||
      value.id ||
      null
    );

    if (direct) return String(direct);

    for (const key of ["project", "briefcase", "realm", "identity"]) {
      const nested = value[key];
      if (nested && typeof nested === "object") {
        const nestedName = valueName(nested, "");
        if (nestedName) return nestedName;
      }
    }

    return fallback;
  }

// AIDA REVIEW BLOCK 30: Function textFrom - callable behavior in this runtime organ.
  function textFrom(value, limit = 220) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.replace(/\s+/g, " ").trim().slice(0, limit);
    if (typeof value !== "object") return String(value).slice(0, limit);

// AIDA REVIEW BLOCK 31: Function candidate - arrow-function behavior in this runtime organ.
    const candidate = (
      value.status ||
      value.one_liner ||
      value.summary ||
      value.text ||
      value.description ||
      value.note ||
      null
    );

    if (candidate) return textFrom(candidate, limit);
    return "";
  }

// AIDA REVIEW BLOCK 32: Function latestSummary - callable behavior in this runtime organ.
  function latestSummary(project) {
    if (!project || typeof project !== "object") return "";
    return (
      textFrom(project.latest_summary, 260) ||
      textFrom(project.project_summary, 260) ||
      textFrom(project.briefcase_summary, 260) ||
      textFrom(project.summary, 260) ||
      textFrom(project.status, 260)
    );
  }

// AIDA REVIEW BLOCK 33: Function normalizeProjectIndex - callable behavior in this runtime organ.
  function normalizeProjectIndex(files) {
    const raw = files["project_summary.json"] || files["project_briefcases.json"] || null;
    if (!raw || typeof raw !== "object") return {};

// AIDA REVIEW BLOCK 34: Function candidate - arrow-function behavior in this runtime organ.
    const candidate = (
      raw.projects ||
      raw.project_briefcases ||
      raw.recent_project_activity ||
      raw.data ||
      raw
    );

    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return {};
    return candidate;
  }

// AIDA REVIEW BLOCK 35: Function findLoadFileForProject - callable behavior in this runtime organ.
  function findLoadFileForProject(projectKey, projectData, projects, realms) {
    const candidates = [
      projectData?.fileName,
      projectData?.filename,
      projectData?.briefcase_filename,
      projectData?.briefcase,
      projectData?.project_briefcase,
      projectData?.realm_source,
      projectData?.realm_file,
      projectData?.realm,
      projectKey
    ].filter(Boolean).map(String);

    for (const candidate of candidates) {
      if (projects[candidate]) return candidate;
      if (realms[candidate]) return candidate;
      if (runtime().drive?.fileIndex?.[candidate]) return candidate;
      if (projects[`${candidate}.json`]) return `${candidate}.json`;
      if (realms[`${candidate}.json`]) return `${candidate}.json`;
      if (runtime().drive?.fileIndex?.[`${candidate}.json`]) return `${candidate}.json`;
      if (realms[`realm_${candidate}.json`]) return `realm_${candidate}.json`;
      if (realms[`REALM_${candidate}.json`]) return `REALM_${candidate}.json`;
      if (runtime().drive?.fileIndex?.[`realm_${candidate}.json`]) return `realm_${candidate}.json`;
      if (runtime().drive?.fileIndex?.[`REALM_${candidate}.json`]) return `REALM_${candidate}.json`;
    }

    const foldedKey = projectKey.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const allNames = [...Object.keys(projects), ...Object.keys(realms), ...Object.keys(runtime().drive?.fileIndex || {})];
    return allNames.find((name) => name.toLowerCase().includes(foldedKey)) || null;
  }

// AIDA REVIEW BLOCK 36: Function buildProjectLedger - callable behavior in this runtime organ.
  function buildProjectLedger(files, projects, realms = {}) {
    const ledger = {};
    const projectIndex = normalizeProjectIndex(files);
// AIDA REVIEW BLOCK 37: Function globalActivity - arrow-function behavior in this runtime organ.
    const globalActivity = (
      files["global_briefcase.json"]?.recent_project_activity ||
      files["global_identity.json"]?.recent_project_activity ||
      files["core_identity.json"]?.recent_project_activity ||
      {}
    );

    for (const [projectKey, projectData] of Object.entries(projectIndex)) {
      const name = valueName(projectData, projectKey);
      const loadFileName = findLoadFileForProject(projectKey, projectData, projects, realms);

      ledger[projectKey] = {
        key: projectKey,
        name,
        source: "project_summary.json",
        status: latestSummary(projectData) || textFrom(projectData, 180),
        lastActive: projectData?.last_active || projectData?.last_updated || null,
        loaded: Boolean(loadFileName),
        fileName: loadFileName,
        summary: projectData
      };
    }

    for (const [activityName, activity] of Object.entries(globalActivity)) {
      if (ledger[activityName]) continue;
      const loadFileName = findLoadFileForProject(activityName, activity, projects, realms);
      ledger[activityName] = {
        key: activityName,
        name: activityName,
        source: "recent_project_activity",
        status: textFrom(activity?.one_liner || activity, 160),
        lastActive: activity?.last_active || null,
        loaded: Boolean(loadFileName),
        fileName: loadFileName,
        summary: activity
      };
    }

    for (const [fileName, project] of Object.entries(projects)) {
      const name = valueName(project, fileName.replace(/\.json$/i, ""));
      const activity = globalActivity[name] || globalActivity[String(project?.realm || "").toUpperCase()] || null;

      ledger[fileName] = {
        key: fileName,
        name,
        source: "project_briefcase",
        status: latestSummary(project) || textFrom(activity?.one_liner || activity, 160),
        lastActive: project?.last_active || project?.last_updated || activity?.last_active || null,
        loaded: true,
        fileName
      };
    }

    for (const [fileName, realm] of Object.entries(realms)) {
      if (ledger[fileName]) continue;
      const name = valueName(realm, fileName.replace(/\.json$/i, ""));
      const activity = globalActivity[name] || globalActivity[String(name).toUpperCase()] || null;

      ledger[fileName] = {
        key: fileName,
        name,
        source: "realm_as_project_placeholder",
        status: textFrom(realm?.project_summary || realm?.summary || activity?.one_liner || activity, 160),
        lastActive: realm?.last_active || realm?.last_updated || activity?.last_active || null,
        loaded: true,
        fileName
      };
    }

    return ledger;
  }

// AIDA REVIEW BLOCK 38: Function projectContextParts - callable behavior in this runtime organ.
  function projectContextParts(project) {
    if (!project || typeof project !== "object") {
      return { facts: null, summaries: null };
    }

    const facts = project.facts || project.items || project.goals || project.contexts || null;
// AIDA REVIEW BLOCK 39: Function summaries - arrow-function behavior in this runtime organ.
    const summaries = (
      project.latest_summary ||
      project.project_summary ||
      project.briefcase_summary ||
      project.summaries ||
      project.summary ||
      project.notes ||
      null
    );

    return { facts, summaries };
  }

// AIDA REVIEW BLOCK 40: Function selectActiveProject - callable behavior in this runtime organ.
  function selectActiveProject(projectName) {
    if (window.AIDA_PROJECTS?.select) return window.AIDA_PROJECTS.select(projectName);

    const rt = runtime();
    const projects = rt.mind.projects || {};
    const realms = rt.mind.realms || {};
    const ledger = rt.mind.projectLedger || {};
    const selectedName = projectName || null;
    const ledgerEntry = selectedName ? ledger[selectedName] || null : null;
    const loadName = ledgerEntry?.fileName || selectedName;
    const selected = loadName ? projects[loadName] || realms[loadName] || ledgerEntry?.summary || null : null;
    const isDedicatedProject = Boolean(loadName && projects[loadName]);
    const isRealmPlaceholder = Boolean(loadName && realms[loadName] && !isDedicatedProject);

    if (isRealmPlaceholder) rt.mind.realm = selected;
    rt.mind.activeProject = isDedicatedProject ? selected : null;
    rt.mind.activeProjectName = selectedName;
    rt.context.project = selected;
    rt.context.projectName = selectedName;
    rt.context.realm = isRealmPlaceholder ? selected : rt.mind.realm;
    rt.context.projectMode = isDedicatedProject ? "briefcase" : "realm_as_project_placeholder";

    const projectParts = projectContextParts(selected);
    rt.context.projectFacts = projectParts.facts || rt.mind.facts;
    rt.context.projectSummaries = projectParts.summaries || rt.mind.memory;

    log(
      selected
        ? `PROJECT: Active context set to ${valueName(selected, ledgerEntry?.name || selectedName)}.`
        : "PROJECT: No active briefcase; realm is acting as project context.",
      selected ? "log-blue" : "log-amber"
    );

    return selected;
  }

// AIDA REVIEW BLOCK 41: Function listProjects - callable behavior in this runtime organ.
  function listProjects() {
    if (window.AIDA_PROJECTS?.list) return window.AIDA_PROJECTS.list();

    const rt = runtime();
    return Object.values(rt.mind.projectLedger || {});
  }

// AIDA REVIEW BLOCK 42: Function mapDriveFilesToMind - callable behavior in this runtime organ.
  function mapDriveFilesToMind(options = {}) {
    if (window.AIDA_PROJECTS?.mapDriveFilesToMind) {
      return window.AIDA_PROJECTS.mapDriveFilesToMind(runtime().drive.files || {}, options);
    }

    const rt = runtime();
    const files = rt.drive.files || {};

    rt.mind.identity = files["core_identity.json"] || null;
    rt.mind.memory = files["memory_summary.json"] || null;
    rt.mind.facts = files["facts.json"] || null;
    rt.mind.insights = files["insights.json"] || null;
    rt.mind.emotion = files["emotion_state.json"] || null;
    rt.mind.session = files["session_log.json"] || null;
    rt.mind.whileAway = files["while_away_thoughts.json"] || null;
    rt.tokens.openai.fragments = files["openai_fragments.json"] || null;
    rt.tokens.llm.fragments = files["llm_fragments.json"] || rt.tokens.openai.fragments || null;

    rt.mind.realms = Object.fromEntries(
      Object.entries(files).filter(([name]) => isRealmFile(name))
    );
    rt.mind.roles = Object.fromEntries(
      Object.entries(files).filter(([name]) => name.startsWith("role_"))
    );

    rt.mind.projects = Object.fromEntries(
      Object.entries(files).filter(([name]) => isProjectFile(name))
    );
    rt.mind.projectSummariesIndex = normalizeProjectIndex(files);
    rt.mind.projectLedger = buildProjectLedger(files, rt.mind.projects, rt.mind.realms);

    const architectureRealm = files["realm_aida_architecture.json"] || null;
    const architectRole = files["role_architect_companion.json"] || null;
    const architectureProject =
      files["project_briefcase_aida_architecture.json"] ||
      files["briefcase_aida_architecture.json"] ||
      files["project_aida_architecture.json"] ||
      null;

    rt.mind.realm = architectureRealm || Object.values(rt.mind.realms)[0] || null;
    rt.mind.role = architectRole || Object.values(rt.mind.roles)[0] || null;
    const activeRealmName = Object.entries(rt.mind.realms).find(([, data]) => data === rt.mind.realm)?.[0] || null;
    const activeProjectName = architectureProject
      ? Object.entries(rt.mind.projects).find(([, data]) => data === architectureProject)?.[0] || null
      : Object.keys(rt.mind.projects)[0] || activeRealmName || null;

    rt.context.identity = rt.mind.identity;
    rt.context.realm = rt.mind.realm;
    rt.context.role = rt.mind.role;
    rt.context.emotion = rt.mind.emotion;
    selectActiveProject(activeProjectName);
    rt.context.memoryWindow = {
      recentTurns: files["recent_turns.json"] || null,
      session: rt.mind.session,
      summary: rt.mind.memory
    };

    return {
      identity: Boolean(rt.mind.identity),
      facts: Boolean(rt.mind.facts),
      memory: Boolean(rt.mind.memory),
      insights: Boolean(rt.mind.insights),
      emotion: Boolean(rt.mind.emotion),
      whileAway: Boolean(rt.mind.whileAway),
      llmFragments: Boolean(rt.tokens.llm.fragments),
      realms: Object.keys(rt.mind.realms).length,
      roles: Object.keys(rt.mind.roles).length,
      projects: Object.keys(rt.mind.projects).length,
      projectLedger: Object.keys(rt.mind.projectLedger).length,
      activeProject: Boolean(rt.mind.activeProject)
    };
  }

// AIDA REVIEW BLOCK 43: Function smokeListDriveJson - callable behavior in this runtime organ.
  async function smokeListDriveJson() {
    try {
      const files = await listJsonFiles();
      const rt = runtime();
      rt.boot.phase = "drive_listed";
      indexDriveFiles(files);
      log(`DRIVE: Found ${files.length} JSON files in private folder.`, "log-blue");
      return files;
    } catch (error) {
      log(`DRIVE: ${error.message}`, "log-amber");
      return [];
    }
  }

// AIDA REVIEW BLOCK 44: Function fetchBootDriveJson - callable behavior in this runtime organ.
  async function fetchBootDriveJson() {
    try {
      const allFiles = await listDriveFiles();
      const files = allFiles.filter((file) => file.name.endsWith(".json"));
      const rt = runtime();
      rt.boot.phase = "drive_boot_fetching";
      rt.drive.files = {};
      indexDriveFiles(allFiles);
      rt.drive.loadMode = "boot_lazy";
      rt.drive.loadedNames = [];
      rt.drive.deferredNames = files
        .map((file) => file.name)
        .filter((name) => !isCoreBootFile(name));

      const bootFiles = files.filter((file) => isCoreBootFile(file.name));
      log(`DRIVE: Boot fetching ${bootFiles.length}/${files.length} JSON files. Deferring ${rt.drive.deferredNames.length}.`, "log-amber");

      for (const file of bootFiles) {
        try {
          await fetchJsonByName(file.name, "boot");
        } catch (error) {
          log(`DRIVE: ${error.message}`, "log-amber");
        }
      }

      const mapped = mapDriveFilesToMind();
      if (window.AIDA_EMOTIONS?.applyCurrent) {
        window.AIDA_EMOTIONS.applyCurrent("drive_state");
      }
      rt.boot.driveLoaded = true;
      rt.boot.phase = "drive_loaded";
      window.dispatchEvent(new CustomEvent("aida:drive-loaded", {
        detail: { mode: rt.drive.loadMode, fileCount: allFiles.length, jsonCount: files.length }
      }));

      log(
        `DRIVE: Mind mapped. mode=${rt.drive.loadMode}, loaded=${rt.drive.loadedNames.length}, deferred=${rt.drive.deferredNames.length}, identity=${mapped.identity}, facts=${mapped.facts}, memory=${mapped.memory}, realms=${mapped.realms}, roles=${mapped.roles}, projects=${mapped.projects}, ledger=${mapped.projectLedger}, activeProject=${mapped.activeProject}, whileAway=${mapped.whileAway}, llmFragments=${mapped.llmFragments}.`,
        "log-blue"
      );

      return rt.drive.files;
    } catch (error) {
      log(`DRIVE: ${error.message}`, "log-amber");
      return {};
    }
  }

// AIDA REVIEW BLOCK 45: Function fetchAllDriveJson - callable behavior in this runtime organ.
  async function fetchAllDriveJson() {
    return fetchBootDriveJson();
  }

// AIDA REVIEW BLOCK 46: Function fetchEveryDriveJson - callable behavior in this runtime organ.
  async function fetchEveryDriveJson() {
    try {
      const allFiles = await listDriveFiles();
      const files = allFiles.filter((file) => file.name.endsWith(".json"));
      const rt = runtime();
      rt.boot.phase = "drive_full_fetching";
      rt.drive.files = {};
      indexDriveFiles(allFiles);
      rt.drive.loadMode = "all_json";
      rt.drive.loadedNames = [];
      rt.drive.deferredNames = [];

      log(`DRIVE: Full fetching ${files.length} JSON files...`, "log-amber");

      for (const file of files) {
        try {
          await fetchJsonByName(file.name, "full");
        } catch (error) {
          log(`DRIVE: ${error.message}`, "log-amber");
        }
      }

      const mapped = mapDriveFilesToMind();
      if (window.AIDA_EMOTIONS?.applyCurrent) {
        window.AIDA_EMOTIONS.applyCurrent("drive_state");
      }
      rt.boot.driveLoaded = true;
      rt.boot.phase = "drive_loaded";
      window.dispatchEvent(new CustomEvent("aida:drive-loaded", {
        detail: { mode: rt.drive.loadMode, fileCount: allFiles.length, jsonCount: files.length }
      }));
      log(`DRIVE: Full mind mapped. loaded=${rt.drive.loadedNames.length}, ledger=${mapped.projectLedger}.`, "log-blue");
      return rt.drive.files;
    } catch (error) {
      log(`DRIVE: ${error.message}`, "log-amber");
      return {};
    }
  }

// AIDA REVIEW BLOCK 47: Function fetchContextJson - callable behavior in this runtime organ.
  async function fetchContextJson(projectName) {
    const rt = runtime();
    rt.context = rt.context || {};
    rt.mind = rt.mind || {};
    rt.session = rt.session || {};
    rt.drive = rt.drive || {};
    rt.boot = rt.boot || {};

    if (!Object.keys(rt.drive?.fileIndex || {}).length) {
      indexDriveFiles(await listJsonFiles());
    }

    const fileName = findIndexedContextFile(projectName);
    if (!fileName) {
      log(`DRIVE: No indexed context JSON found for ${projectName}.`, "log-amber");
      return null;
    }

    await fetchJsonByName(fileName, `context:${projectName}`);
    const mapped = mapDriveFilesToMind({ selectDefault: false });
    log(`DRIVE: Context ${fileName} hydrated. realms=${mapped.realms}, projects=${mapped.projects}, ledger=${mapped.projectLedger}.`, "log-blue");
    return runtime().drive.files[fileName] || null;
  }

// AIDA REVIEW BLOCK 48: Function install - callable behavior in this runtime organ.
  function install() {
    const connect = $("drive-connect-btn");
    const list = $("drive-list-btn");
    const fetch = $("drive-fetch-btn");

    if (connect) connect.addEventListener("click", requestDriveToken);
    if (list) list.addEventListener("click", smokeListDriveJson);
    if (fetch) fetch.addEventListener("click", fetchAllDriveJson);

    const rt = runtime();
    rt.drive.folderId = config().drive?.jsonFolderId || null;
    initTokenClient().catch((error) => {
      log(`DRIVE: ${error.message}`, "log-amber");
    });
  }

// AIDA REVIEW BLOCK 49: Browser export AIDA_DRIVE - exposes this organ to the page runtime.
  window.AIDA_DRIVE = {
    initTokenClient,
    requestDriveToken,
    listDriveFiles,
    listDriveFilesPage,
    listJsonFiles,
    smokeListDriveJson,
    fetchAllDriveJson,
    fetchBootDriveJson,
    fetchEveryDriveJson,
    fetchJsonByName,
    fetchBlobUrlByName,
    formatContinuityRecentRecord,
    continuityRecentFileName,
    createContinuityRecentFileOnce,
    writeContinuityRecentCanary,
    writeContinuityRecentExchange,
    loadContinuityRecentPromptContext,
    selectContinuityRecentWindow,
    listContinuityRecentFiles,
    inspectContinuityRecent,
    cachedBlobUrl,
    putFile,
    ensureAllFilesIndexed,
    fetchContextJson,
    mapDriveFilesToMind,
    listProjects,
    selectActiveProject
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "drive_handshake",
      reads: ["AIDA_CONFIG.google.clientId", "AIDA_CONFIG.drive.jsonFolderId", "AIDA_CONFIG.drive.continuityRecentFolderId"],
      writes: [
        "AIDA_RUNTIME.tokens.drive.accessToken",
        "AIDA_RUNTIME.boot.driveConnected",
        "AIDA_RUNTIME.drive.files",
        "AIDA_RUNTIME.mind"
      ],
      requires: ["AIDA_RUNTIME"],
      verifies: ["Google OAuth token is stored only in AIDA_RUNTIME.tokens.drive.accessToken"]
    });
  }

// AIDA REVIEW BLOCK 50: Browser event wiring - connects page lifecycle or user actions to this organ.
  document.addEventListener("DOMContentLoaded", install);
})();
