(function () {
  const MODULE_ID = "spine.drive.oauth";
  const GIS_SRC = "https://accounts.google.com/gsi/client";
  const CORE_BOOT_JSON = new Set([
    "core_identity.json",
    "global_identity.json",
    "global_briefcase.json",
    "memory_summary.json",
    "facts.json",
    "insights.json",
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

  async function fetchJsonFile(file) {
    const token = runtime().tokens.drive.accessToken;
    const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Fetch failed for ${file.name}: HTTP ${response.status}.`);
    }

    return response.json();
  }

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

  function isRealmFile(name) {
    return name.startsWith("realm_") || name.startsWith("REALM_");
  }

  function isRoleFile(name) {
    return name.startsWith("role_");
  }

  function isCoreBootFile(name) {
    return CORE_BOOT_JSON.has(name) || isRoleFile(name) || DEFAULT_CONTEXT_FILES.includes(name);
  }

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

  function driveFileFromIndex(name) {
    const entry = runtime().drive?.fileIndex?.[name] || null;
    if (!entry?.id) return null;
    return entry;
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

  function findIndexedContextFile(projectName) {
    const rt = runtime();
    const ledger = rt.mind?.projectLedger || {};
    const ledgerEntry = ledger[projectName] || null;
    const candidates = [
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

  function valueName(value, fallback = "unnamed") {
    if (!value || typeof value !== "object") return fallback;

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

  function textFrom(value, limit = 220) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.replace(/\s+/g, " ").trim().slice(0, limit);
    if (typeof value !== "object") return String(value).slice(0, limit);

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

  function normalizeProjectIndex(files) {
    const raw = files["project_summary.json"] || files["project_briefcases.json"] || null;
    if (!raw || typeof raw !== "object") return {};

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

  function buildProjectLedger(files, projects, realms = {}) {
    const ledger = {};
    const projectIndex = normalizeProjectIndex(files);
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

  function projectContextParts(project) {
    if (!project || typeof project !== "object") {
      return { facts: null, summaries: null };
    }

    const facts = project.facts || project.items || project.goals || project.contexts || null;
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

  function listProjects() {
    if (window.AIDA_PROJECTS?.list) return window.AIDA_PROJECTS.list();

    const rt = runtime();
    return Object.values(rt.mind.projectLedger || {});
  }

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

  async function fetchBootDriveJson() {
    try {
      const files = await listJsonFiles();
      const rt = runtime();
      rt.boot.phase = "drive_boot_fetching";
      rt.drive.files = {};
      indexDriveFiles(files);
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

  async function fetchAllDriveJson() {
    return fetchBootDriveJson();
  }

  async function fetchEveryDriveJson() {
    try {
      const files = await listJsonFiles();
      const rt = runtime();
      rt.boot.phase = "drive_full_fetching";
      rt.drive.files = {};
      indexDriveFiles(files);
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
      log(`DRIVE: Full mind mapped. loaded=${rt.drive.loadedNames.length}, ledger=${mapped.projectLedger}.`, "log-blue");
      return rt.drive.files;
    } catch (error) {
      log(`DRIVE: ${error.message}`, "log-amber");
      return {};
    }
  }

  async function fetchContextJson(projectName) {
    const rt = runtime();
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

  window.AIDA_DRIVE = {
    initTokenClient,
    requestDriveToken,
    listJsonFiles,
    smokeListDriveJson,
    fetchAllDriveJson,
    fetchBootDriveJson,
    fetchEveryDriveJson,
    fetchJsonByName,
    fetchContextJson,
    mapDriveFilesToMind,
    listProjects,
    selectActiveProject
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "drive_handshake",
      reads: ["AIDA_CONFIG.google.clientId", "AIDA_CONFIG.drive.jsonFolderId"],
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

  document.addEventListener("DOMContentLoaded", install);
})();
