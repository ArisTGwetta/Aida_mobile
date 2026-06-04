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
      name.startsWith("project_") ||
      name.startsWith("briefcase_") ||
      name.startsWith("project_briefcase_")
    );
  }

  function isRealmFile(name) {
    return name.startsWith("realm_") || name.startsWith("REALM_");
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

  function buildProjectLedger(files, projects) {
    const ledger = {};
    const globalActivity = (
      files["global_briefcase.json"]?.recent_project_activity ||
      files["global_identity.json"]?.recent_project_activity ||
      files["core_identity.json"]?.recent_project_activity ||
      {}
    );

    for (const [activityName, activity] of Object.entries(globalActivity)) {
      ledger[activityName] = {
        key: activityName,
        name: activityName,
        source: "recent_project_activity",
        status: textFrom(activity?.one_liner || activity, 160),
        lastActive: activity?.last_active || null,
        loaded: false,
        fileName: null
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

    const realms = Object.fromEntries(
      Object.entries(files).filter(([name]) => isRealmFile(name))
    );

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
    const rt = runtime();
    const projects = rt.mind.projects || {};
    const realms = rt.mind.realms || {};
    const selectedName = projectName || null;
    const selected = selectedName ? projects[selectedName] || realms[selectedName] || null : null;
    const isDedicatedProject = Boolean(selectedName && projects[selectedName]);
    const isRealmPlaceholder = Boolean(selectedName && realms[selectedName] && !isDedicatedProject);

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
        ? `PROJECT: Active context set to ${valueName(selected, selectedName)}.`
        : "PROJECT: No active briefcase; realm is acting as project context.",
      selected ? "log-blue" : "log-amber"
    );

    return selected;
  }

  function listProjects() {
    const rt = runtime();
    return Object.values(rt.mind.projectLedger || {});
  }

  function mapDriveFilesToMind() {
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
    rt.mind.projectLedger = buildProjectLedger(files, rt.mind.projects);

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

  async function fetchAllDriveJson() {
    try {
      const files = await listJsonFiles();
      const rt = runtime();
      rt.boot.phase = "drive_fetching";
      rt.drive.files = {};
      rt.drive.fileIndex = {};

      log(`DRIVE: Fetching ${files.length} JSON files...`, "log-amber");

      for (const file of files) {
        try {
          const data = await fetchJsonFile(file);
          rt.drive.files[file.name] = data;
          rt.drive.fileIndex[file.name] = {
            id: file.id,
            mimeType: file.mimeType,
            modifiedTime: file.modifiedTime
          };
          log(`DRIVE: Loaded ${file.name}`);
        } catch (error) {
          log(`DRIVE: ${error.message}`, "log-amber");
        }
      }

      const mapped = mapDriveFilesToMind();
      rt.boot.driveLoaded = true;
      rt.boot.phase = "drive_loaded";

      log(
        `DRIVE: Mind mapped. identity=${mapped.identity}, facts=${mapped.facts}, memory=${mapped.memory}, realms=${mapped.realms}, roles=${mapped.roles}, projects=${mapped.projects}, ledger=${mapped.projectLedger}, activeProject=${mapped.activeProject}, whileAway=${mapped.whileAway}, llmFragments=${mapped.llmFragments}.`,
        "log-blue"
      );

      return rt.drive.files;
    } catch (error) {
      log(`DRIVE: ${error.message}`, "log-amber");
      return {};
    }
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
