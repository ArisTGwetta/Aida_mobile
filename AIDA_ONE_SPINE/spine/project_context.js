(function () {
  const MODULE_ID = "spine.project.context";

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function log(message, className = "log-green") {
    if (window.AIDA_BIOS?.log) {
      window.AIDA_BIOS.log(message, className);
      return;
    }

    if (window.AIDA_BODY?.pulse) {
      window.AIDA_BODY.pulse(message);
    }
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

  function valueName(value, fallback = "unnamed") {
    if (!value || typeof value !== "object") return fallback;

    const direct = (
      value.project_name ||
      value.briefcase_title ||
      value.briefcase_name ||
      value.display_name ||
      value.displayName ||
      value.realm_name ||
      value.role_name ||
      value.identity_name ||
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

  function keyName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\.json$/i, "")
      .replace(/^role_/, "")
      .replace(/^realm_/, "")
      .replace(/^project_briefcase_/, "")
      .replace(/^briefcase_/, "")
      .replace(/^project_/, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function firstPresent(...values) {
    return values.find((value) => value !== undefined && value !== null && value !== "");
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

  function isSupersededProject(project) {
    return Boolean(
      project &&
      typeof project === "object" &&
      (
        project.archived === true ||
        String(project.status || "").toLowerCase() === "superseded" ||
        project.superseded_by
      )
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

  function buildProjectLedger(files, projects, realms) {
    const ledger = {};
    const projectIndex = normalizeProjectIndex(files);
    const globalActivity = (
      files["global_briefcase.json"]?.recent_project_activity ||
      files["global_identity.json"]?.recent_project_activity ||
      files["core_identity.json"]?.recent_project_activity ||
      {}
    );

    for (const [projectKey, projectData] of Object.entries(projectIndex)) {
      if (isSupersededProject(projectData)) continue;
      const name = valueName(projectData, projectKey);
      const loadFileName = findLoadFileForProject(projectKey, projectData, projects, realms);
      if (loadFileName && (realms[loadFileName] || isRealmFile(loadFileName))) continue;

      ledger[projectKey] = {
        key: projectKey,
        name,
        kind: "project",
        realmKey: keyName(projectData?.realm || projectData?.realm_name || "unknown"),
        llmProvider: projectData?.llm_provider || projectData?.llmProvider || null,
        source: "project_index",
        status: latestSummary(projectData) || textFrom(projectData, 180),
        lastActive: projectData?.last_active || projectData?.last_updated || null,
        loaded: Boolean(loadFileName),
        fileName: loadFileName,
        summary: projectData
      };
    }

    for (const [activityName, activity] of Object.entries(globalActivity)) {
      if (isSupersededProject(activity)) continue;
      if (ledger[activityName]) continue;
      const loadFileName = findLoadFileForProject(activityName, activity, projects, realms);
      if (loadFileName && (realms[loadFileName] || isRealmFile(loadFileName))) continue;

      ledger[activityName] = {
        key: activityName,
        name: activityName,
        kind: "project",
        realmKey: keyName(activity?.realm || activity?.realm_name || "unknown"),
        llmProvider: activity?.llm_provider || activity?.llmProvider || null,
        source: "recent_activity",
        status: textFrom(activity?.one_liner || activity, 160),
        lastActive: activity?.last_active || null,
        loaded: Boolean(loadFileName),
        fileName: loadFileName,
        summary: activity
      };
    }

    for (const [fileName, project] of Object.entries(projects)) {
      if (isSupersededProject(project)) continue;
      const name = valueName(project, fileName.replace(/\.json$/i, ""));
      const activity = globalActivity[name] || globalActivity[String(project?.realm || "").toUpperCase()] || null;

      if (ledger[fileName]) continue;
      ledger[fileName] = {
        key: fileName,
        name,
        kind: "project",
        realmKey: keyName(project?.realm || project?.realm_name || "unknown"),
        llmProvider: project?.llm_provider || project?.llmProvider || null,
        source: "project_payload",
        status: latestSummary(project) || textFrom(activity?.one_liner || activity, 160),
        lastActive: project?.last_active || project?.last_updated || activity?.last_active || null,
        loaded: true,
        fileName
      };
    }

    for (const fileName of Object.keys(runtime().drive?.fileIndex || {})) {
      if (!isProjectFile(fileName)) continue;
      if (ledger[fileName]) continue;

      ledger[fileName] = {
        key: fileName,
        name: fileName.replace(/\.json$/i, "").replace(/^(realm_|project_briefcase_|briefcase_|project_)/i, "").toUpperCase(),
        kind: "project",
        realmKey: "unknown",
        llmProvider: null,
        source: "indexed_project_payload",
        status: "Available in Drive; loads when selected.",
        lastActive: runtime().drive.fileIndex[fileName]?.modifiedTime || null,
        loaded: Boolean(projects[fileName] || realms[fileName]),
        fileName
      };
    }

    const payloadByName = new Map();
    for (const entry of Object.values(ledger)) {
      if (entry.source === "project_payload" || entry.source === "conversation_draft") {
        payloadByName.set(keyName(entry.name), entry.key);
      }
    }
    for (const [entryKey, entry] of Object.entries(ledger)) {
      const payloadKey = payloadByName.get(keyName(entry.name));
      if (payloadKey && payloadKey !== entryKey && entry.source !== "project_payload") {
        delete ledger[entryKey];
      }
    }

    return ledger;
  }

  function buildRealmLedger(realms) {
    const ledger = {};
    const addRealm = (fileName, realm, loaded) => {
      const realmKey = keyName(valueName(realm, fileName));
      if (!realmKey || ledger[realmKey]?.loaded) return;
      ledger[realmKey] = {
        key: fileName,
        realmKey,
        name: valueName(realm, realmKey.toUpperCase()),
        kind: "realm",
        source: loaded ? "realm_payload" : "indexed_realm",
        status: loaded
          ? textFrom(realm?.project_summary || realm?.summary || realm?.description, 160)
          : "Available in Drive; loads when selected.",
        lastActive: realm?.last_active || realm?.last_updated || runtime().drive?.fileIndex?.[fileName]?.modifiedTime || null,
        loaded,
        fileName,
        summary: realm
      };
    };

    for (const [fileName, realm] of Object.entries(realms)) addRealm(fileName, realm, true);
    for (const fileName of Object.keys(runtime().drive?.fileIndex || {})) {
      if (isRealmFile(fileName)) addRealm(fileName, {}, false);
    }
    return ledger;
  }

  function resolveRealmEntry(value) {
    const rt = runtime();
    const wanted = keyName(value);
    return Object.values(rt.mind.realmLedger || {}).find((entry) => (
      entry.realmKey === wanted ||
      keyName(entry.key) === wanted ||
      keyName(entry.fileName) === wanted ||
      keyName(entry.name) === wanted
    )) || null;
  }

  function contextParts(project) {
    if (!project || typeof project !== "object") {
      return {
        facts: null,
        summaries: null,
        memory: null,
        recentTurns: null,
        interactionRules: null,
        roleRef: null
      };
    }

    const facts = firstPresent(
      project.facts,
      project.realm_facts,
      project.project_facts,
      project.items,
      project.goals,
      project.contexts
    ) || null;
    const summaries = (
      project.latest_summary ||
      project.project_summary ||
      project.briefcase_summary ||
      project.summaries ||
      project.summary ||
      project.notes ||
      null
    );
    const memory = firstPresent(
      project.memory,
      project.project_memory,
      project.realm_memory,
      project.memory_summary,
      summaries
    ) || null;
    const recentTurns = firstPresent(
      project.recent_turns,
      project.recentTurns,
      project.turns,
      project.session_memory,
      project.sessionMemory
    ) || null;
    const interactionRules = firstPresent(
      project.interaction_rules,
      project.interactionRules,
      project.rules,
      project.conversation_rules,
      project.behavior_rules,
      project.voice_rules,
      project.boundaries
    ) || null;
    const roleRef = firstPresent(
      project.role,
      project.role_file,
      project.roleFile,
      project.default_role,
      project.defaultRole,
      project.preferred_role,
      project.preferredRole
    ) || null;

    return { facts, summaries, memory, recentTurns, interactionRules, roleRef };
  }

  function roleRefs(roleRef) {
    if (!roleRef) return [];
    if (Array.isArray(roleRef)) return roleRef.flatMap(roleRefs);
    if (typeof roleRef === "object") {
      return [
        roleRef.file,
        roleRef.fileName,
        roleRef.filename,
        roleRef.key,
        roleRef.id,
        roleRef.name,
        roleRef.role_name,
        roleRef.display_name,
        valueName(roleRef, "")
      ].filter(Boolean);
    }
    return [roleRef];
  }

  function defaultRoleRefsFor(selected) {
    const selectedKey = keyName(valueName(selected, ""));
    const aliases = {
      oracle: ["role_oracle_voice.json", "oracle_voice"],
      compliance: ["role_compliance_officer.json", "compliance_officer"],
      chronicle: ["role_chronicler.json", "chronicler"],
      protocol_mx: ["role_protocol_unit.json", "protocol_unit"],
      aida_architecture: ["role_architect_companion.json", "architect_companion"],
      rpg: ["role_co_narrator.json", "role_co-narrator.json", "co_narrator", "co-narrator"]
    };

    return aliases[selectedKey] || [];
  }

  function cleanCheckpointKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\.json$/i, "")
      .replace(/^realm_/, "")
      .replace(/^project_briefcase_/, "")
      .replace(/^briefcase_/, "")
      .replace(/^project_/, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function latestExchange(rt) {
    const turns = rt.session?.currentTurns || [];
    return turns[turns.length - 1] || null;
  }

  function exchangeBelongsToContext(exchange, contextKey) {
    if (!exchange || !contextKey) return false;
    const expected = cleanCheckpointKey(contextKey);
    const candidates = [
      exchange.context?.projectFile,
      exchange.context?.project,
      exchange.context?.realm,
      exchange.tags?.project_file,
      exchange.tags?.project,
      exchange.tags?.realm
    ].map(cleanCheckpointKey).filter(Boolean);

    return candidates.includes(expected);
  }

  function hasUncheckpointedContextWork(rt, currentKey) {
    const exchange = latestExchange(rt);
    if (!exchangeBelongsToContext(exchange, currentKey)) return false;

    const latestTurn = exchange.turnIndex || rt.session?.exchangeCount || 0;
    const lastCheckpointTurn = rt.sleep?.lastContextCheckpoint?.turnIndex || 0;
    return latestTurn > lastCheckpointTurn;
  }

  function checkpointBeforeContextSwitch(nextKey) {
    const rt = runtime();
    const currentKey = rt.context?.projectName || rt.mind?.activeProjectName || null;
    const isRealSwitch = currentKey && nextKey && currentKey !== nextKey;
    if (!isRealSwitch || !hasUncheckpointedContextWork(rt, currentKey)) return null;

    if (!window.AIDA_SLEEP?.buildPacket) {
      log(`PROJECT: Unsaved context exists before switching from ${currentKey}; sleep collector is not loaded yet.`, "log-amber");
      return null;
    }

    const packet = window.AIDA_SLEEP.buildPacket("project_context_switch");
    rt.sleep.lastContextCheckpoint = {
      packetId: packet?.id || null,
      projectName: currentKey,
      nextProjectName: nextKey,
      turnIndex: latestExchange(rt)?.turnIndex || rt.session?.exchangeCount || 0,
      capturedAt: new Date().toISOString()
    };
    log(`PROJECT: Boundary checkpoint captured before switching ${currentKey} -> ${nextKey}.`, "log-blue");
    return packet;
  }

  function resolveRole(roleRef, selected) {
    const rt = runtime();
    const roles = rt.mind.roles || {};

    if (roleRef && typeof roleRef === "object" && !Array.isArray(roleRef)) {
      const looksLikeRole = Boolean(
        roleRef.role_name ||
        roleRef.instructions ||
        roleRef.protocol ||
        roleRef.voice ||
        roleRef.persona ||
        roleRef.directives ||
        roleRef.system_prompt
      );
      if (looksLikeRole) return { role: roleRef, source: "embedded_role" };
    }

    const refs = [...roleRefs(roleRef), ...defaultRoleRefsFor(selected)];

    for (const ref of refs) {
      const raw = String(ref);
      const candidates = [
        raw,
        `${raw}.json`,
        `role_${raw}.json`,
        `role_${keyName(raw)}.json`
      ];
      for (const candidate of candidates) {
        if (roles[candidate]) return { role: roles[candidate], source: candidate };
      }

      const refKey = keyName(raw);
      const match = Object.entries(roles).find(([fileName, role]) => (
        keyName(fileName) === refKey ||
        keyName(valueName(role, "")) === refKey ||
        keyName(role?.role_name || role?.name || role?.id || "") === refKey
      ));
      if (match) return { role: match[1], source: match[0] };
    }

    if (selected && typeof selected === "object") {
      const selectedKey = keyName(valueName(selected, ""));
      const contextual = Object.entries(roles).find(([fileName]) => keyName(fileName).includes(selectedKey));
      if (contextual) return { role: contextual[1], source: contextual[0] };
    }

    return { role: rt.mind.role || Object.values(roles)[0] || null, source: "default_role" };
  }

  function select(projectKey) {
    const rt = runtime();
    const projects = rt.mind.projects || {};
    const realms = rt.mind.realms || {};
    const ledger = rt.mind.projectLedger || {};
    const selectedKey = projectKey || null;
    checkpointBeforeContextSwitch(selectedKey);
    const ledgerEntry = selectedKey ? ledger[selectedKey] || null : null;
    const loadName = ledgerEntry?.fileName || selectedKey;
    const selected = loadName ? projects[loadName] || realms[loadName] || ledgerEntry?.summary || null : null;
    const isDedicatedProject = Boolean(loadName && projects[loadName]);
    const isRealmContext = Boolean(loadName && realms[loadName] && !isDedicatedProject);

    if (isRealmContext) {
      rt.mind.realm = selected;
      rt.mind.activeRealmName = selectedKey;
      rt.context.activeRealmName = selectedKey;
      rt.context.activeProjectName = null;
      rt.context.unnamedStoryBoundaryTurn = safeArray(rt.session?.currentTurns).length;
      rt.context.pendingUnnamedStory = null;
    }
    if (isDedicatedProject) {
      const realmEntry = resolveRealmEntry(selected?.realm || selected?.realm_name);
      const realmFile = realmEntry?.fileName;
      const projectRealm = realmFile ? realms[realmFile] || realmEntry?.summary : null;
      if (projectRealm) rt.mind.realm = projectRealm;
      rt.mind.activeRealmName = realmEntry?.key || rt.mind.activeRealmName || null;
      rt.context.activeRealmName = rt.mind.activeRealmName;
      rt.context.activeProjectName = selectedKey;
      rt.context.pendingUnnamedStory = null;
    }
    rt.mind.activeProject = isDedicatedProject ? selected : null;
    rt.mind.activeProjectName = isDedicatedProject ? selectedKey : null;

    rt.context.realm = rt.mind.realm;
    rt.context.project = selected;
    rt.context.projectName = selectedKey;
    rt.context.projectMode = isDedicatedProject ? "project_payload" : isRealmContext ? "realm_context" : "project_index";

    const parts = contextParts(selected);
    const roleSelection = resolveRole(parts.roleRef, selected);

    rt.mind.role = roleSelection.role || rt.mind.role;
    rt.context.role = roleSelection.role || rt.context.role || rt.mind.role;
    rt.context.roleSource = roleSelection.source;
    rt.context.projectFacts = parts.facts || rt.mind.facts;
    rt.context.projectSummaries = parts.summaries || rt.mind.memory;
    rt.context.projectMemory = parts.memory || parts.summaries || rt.mind.memory;
    rt.context.projectRecentTurns = parts.recentTurns || null;
    rt.context.interactionRules = parts.interactionRules || null;
    rt.context.memoryWindow = {
      ...(rt.context.memoryWindow || {}),
      recentTurns: parts.recentTurns || rt.context.memoryWindow?.recentTurns || rt.drive?.files?.["recent_turns.json"] || null,
      session: rt.context.memoryWindow?.session || rt.mind.session,
      summary: parts.memory || parts.summaries || rt.mind.memory
    };
    rt.context.tetrad = null;
    rt.context.llmMessages = null;
    rt.boot.mindReady = false;

    log(
      selected
        ? `PROJECT: Active context set to ${valueName(selected, ledgerEntry?.name || selectedKey)}.`
        : "PROJECT: No active context selected.",
      selected ? "log-blue" : "log-amber"
    );
    if (roleSelection.role) {
      log(`PROJECT: Role ${roleSelection.source === "preserved_or_default" ? "preserved" : "resolved"} as ${valueName(roleSelection.role, "unnamed_role")}.`, "log-blue");
    }

    if (window.AIDA_LLM_MESSAGES?.build) {
      const result = window.AIDA_LLM_MESSAGES.build("");
      if (!result?.blocked) {
        log("PROJECT: LLM context rebuilt for active selection.", "log-blue");
      }
    }

    window.dispatchEvent(new CustomEvent("aida:project-context-changed", {
      detail: {
        key: selectedKey,
        loadName,
        mode: rt.context.projectMode,
        name: selected ? valueName(selected, ledgerEntry?.name || selectedKey) : null,
        realmKey: rt.context.activeRealmName,
        projectKey: rt.context.activeProjectName
      }
    }));

    return selected;
  }

  function createDraft(name, options = {}) {
    const rt = runtime();
    const cleanName = String(name || "").replace(/\s+/g, " ").trim();
    if (!cleanName) throw new Error("A project name is required.");

    const slug = keyName(cleanName);
    if (!slug) throw new Error("The project name needs at least one letter or number.");

    const fileName = `project_briefcase_${slug}.json`;
    const existingKey = Object.keys(rt.mind.projectLedger || {}).find((key) => (
      keyName(key) === slug ||
      keyName(rt.mind.projectLedger[key]?.name || "") === slug
    ));
    if (existingKey) {
      select(existingKey);
      return {
        created: false,
        key: existingKey,
        fileName: rt.mind.projectLedger[existingKey]?.fileName || existingKey,
        project: rt.context.project
      };
    }

    const realmName = String(
      options.realm ||
      valueName(rt.context?.realm || rt.mind?.realm, "rpg")
    ).trim();
    const createdAt = new Date().toISOString();
    const project = {
      project_name: cleanName,
      name: cleanName,
      kind: "project",
      status: "runtime_draft",
      realm: realmName,
      role: options.role || "role_co_narrator.json",
      privacy: options.privacy || "private_candidate",
      summary: options.summary || `New ${realmName} project created in conversation.`,
      interaction_rules: {
        mode: "collaborative roleplay",
        rules: [
          "Aida remains the co-author outside labeled character dialogue.",
          "Keep Aida, Narrator, and character voices distinct.",
          "Use cinematic discretion to preserve story flow when direct depiction should stop."
        ]
      },
      facts: [],
      memory: {},
      recent_turns: [],
      open_threads: [],
      created_at: createdAt,
      last_updated: createdAt,
      draft: {
        status: "runtime_only",
        created_via: "conversation_command",
        target_file: fileName
      }
    };

    rt.mind.projects = rt.mind.projects || {};
    rt.mind.projectLedger = rt.mind.projectLedger || {};
    rt.drive.files = rt.drive.files || {};

    rt.mind.projects[fileName] = project;
    rt.drive.files[fileName] = project;
    rt.mind.projectLedger[fileName] = {
      key: fileName,
      name: cleanName,
      kind: "project",
      realmKey: keyName(realmName),
      source: "conversation_draft",
      status: project.summary,
      lastActive: createdAt,
      loaded: true,
      fileName,
      summary: project
    };

    select(fileName);
    rt.context.projectMode = "new_project_draft";
    rt.context.newProjectDraft = {
      name: cleanName,
      slug,
      fileName,
      realm: realmName,
      createdAt,
      privacy: project.privacy
    };

    log(`PROJECT: Created runtime draft ${cleanName} -> ${fileName}.`, "log-blue");
    return {
      created: true,
      key: fileName,
      fileName,
      project
    };
  }

  function activeLlmProvider() {
    return window.AIDA_LLM_SCOPE?.current?.().provider || runtime().tokens?.llm?.provider || null;
  }

  function isGenericRpg(value) {
    return /^(rpg|realm_rpg|realm_as_project_rpg)$/i.test(keyName(value || ""));
  }

  function sourceRef(record, fallbackIndex) {
    return (
      safeArray(record?.source_refs)[0] ||
      record?.source_ref ||
      `${record?.session_id || record?.tags?.session_id || "session"}#turn_${record?.turnIndex || fallbackIndex}`
    );
  }

  function historyRecord(record, fallbackIndex) {
    const tags = record?.tags || {};
    return {
      source_ref: sourceRef(record, fallbackIndex),
      captured_at: record?.capturedAt || record?.captured_at || null,
      original_project: record?.project || tags.project || "rpg",
      original_realm: record?.realm || tags.realm || "rpg",
      llm_provider: record?.llm_provider || tags.llm_provider || null,
      llm_scope: record?.llm_scope || tags.llm_scope || record?.llm_provider || tags.llm_provider || null,
      user: String(record?.user?.text || record?.user || "").trim(),
      aida: String(record?.aida?.text || record?.aida || "").trim()
    };
  }

  function isAdoptableRecord(record, provider) {
    const item = historyRecord(record, 0);
    const project = record?.project || record?.tags?.project || item.original_project;
    const realm = record?.realm || record?.tags?.realm || item.original_realm;
    const itemProvider = record?.llm_provider || record?.tags?.llm_provider || item.llm_provider;
    const text = `${item.user} ${item.aida}`;
    return (
      itemProvider === provider &&
      (isGenericRpg(project) || isGenericRpg(realm)) &&
      !/^\s*#(?:newproject|new-project|project|adopthistory)\b/i.test(item.user) &&
      !/\bNew project opened:\b/i.test(item.aida) &&
      text.trim().length > 0
    );
  }

  function recentAdoptableHistory(options = {}) {
    const rt = runtime();
    const provider = options.provider || activeLlmProvider();
    const limit = Number(options.limit || 12);
    const current = safeArray(rt.session?.currentTurns)
      .filter((record) => isAdoptableRecord(record, provider))
      .map(historyRecord);
    if (current.length) return current.slice(-limit);

    const raw = rt.drive?.files?.["raw_session_log.json"];
    const records = safeArray(raw?.entries || raw);
    return records
      .filter((record) => isAdoptableRecord(record, provider))
      .map(historyRecord)
      .sort((a, b) => String(a.captured_at || "").localeCompare(String(b.captured_at || "")))
      .slice(-limit);
  }

  function openingHint(records) {
    const words = records
      .flatMap((item) => `${item.user} ${item.aida}`.toLowerCase().match(/[a-z]{4,}/g) || [])
      .filter((word) => ![
        "aida", "francisco", "story", "project", "would", "could", "about", "there",
        "their", "these", "those", "with", "from", "have", "that", "this", "your",
        "they", "them", "what", "when", "where", "which", "will", "just", "like"
      ].includes(word));
    const counts = words.reduce((map, word) => {
      map[word] = (map[word] || 0) + 1;
      return map;
    }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word)
      .join(", ");
  }

  function adoptHistory(options = {}) {
    const rt = runtime();
    const project = rt.context?.project;
    const fileName = rt.context?.projectName;
    if (!project || !fileName || rt.context?.projectMode === "realm_context") {
      return { ok: false, reason: "named_project_required" };
    }

    const records = recentAdoptableHistory(options);
    if (!records.length) {
      return {
        ok: false,
        reason: "no_same_llm_rpg_history",
        provider: activeLlmProvider()
      };
    }

    const existingRefs = new Set(safeArray(project.adopted_history).map((item) => item.source_ref));
    const adopted = records.filter((item) => !existingRefs.has(item.source_ref));
    if (!adopted.length) {
      return {
        ok: true,
        alreadyAdopted: true,
        count: 0,
        projectName: valueName(project, fileName),
        provider: activeLlmProvider()
      };
    }

    const adoptedAt = new Date().toISOString();
    project.adopted_history = [...safeArray(project.adopted_history), ...adopted];
    project.recent_turns = [...safeArray(project.recent_turns), ...adopted].slice(-24);
    project.opening_material = {
      source: "adopted_same_llm_rpg_history",
      adopted_at: adoptedAt,
      llm_provider: activeLlmProvider(),
      source_refs: adopted.map((item) => item.source_ref),
      turn_count: adopted.length,
      hint: openingHint(adopted)
    };
    project.summary = `Opening brainstorm adopted from ${adopted.length} earlier ${activeLlmProvider()} RPG turn(s).`;
    project.last_updated = adoptedAt;
    rt.drive.files[fileName] = project;
    rt.mind.projects[fileName] = project;
    rt.context.projectRecentTurns = project.recent_turns;
    rt.context.projectMemory = project.memory || project.opening_material;
    rt.context.memoryWindow = {
      ...(rt.context.memoryWindow || {}),
      recentTurns: project.recent_turns,
      summary: project.opening_material
    };
    rt.context.tetrad = null;
    rt.context.llmMessages = null;
    rt.boot.mindReady = false;

    log(`PROJECT: Adopted ${adopted.length} ${activeLlmProvider()} RPG turn(s) into ${valueName(project, fileName)}.`, "log-blue");
    window.AIDA_CRASH_BUFFER?.checkpoint?.("project_history_adopted");
    return {
      ok: true,
      count: adopted.length,
      projectName: valueName(project, fileName),
      fileName,
      provider: activeLlmProvider(),
      sourceStart: adopted[0].source_ref,
      sourceEnd: adopted[adopted.length - 1].source_ref,
      hint: project.opening_material.hint
    };
  }

  function suggestUnnamedStory() {
    runtime().context.pendingUnnamedStory = null;
    return null;
  }

  function consumeUnnamedStoryTitle(text) {
    runtime().context.pendingUnnamedStory = null;
    return null;
  }

  function needsHydration(projectKey) {
    const rt = runtime();
    const ledger = rt.mind.projectLedger || {};
    const realmEntry = projectKey
      ? Object.values(rt.mind.realmLedger || {}).find((entry) => entry.key === projectKey || entry.realmKey === keyName(projectKey))
      : null;
    const ledgerEntry = projectKey ? ledger[projectKey] || realmEntry || null : null;
    const loadName = ledgerEntry?.fileName || projectKey;
    return Boolean(
      loadName &&
      rt.drive?.fileIndex?.[loadName] &&
      !rt.drive?.files?.[loadName]
    );
  }

  async function selectHydrated(projectKey) {
    if (needsHydration(projectKey)) {
      log(`PROJECT: Hydrating ${projectKey} from Drive before selection.`, "log-amber");
      await window.AIDA_DRIVE?.fetchContextJson?.(projectKey);
    }

    return select(projectKey);
  }

  let hierarchyHydration = null;
  function hierarchyNeedsHydration() {
    const rt = runtime();
    return Object.keys(rt.drive?.fileIndex || {}).some((fileName) => (
      isProjectFile(fileName) && !rt.drive?.files?.[fileName]
    ));
  }

  async function hydrateHierarchy() {
    if (!hierarchyNeedsHydration()) return hierarchy();
    if (hierarchyHydration) return hierarchyHydration;

    const rt = runtime();
    const pending = Object.keys(rt.drive?.fileIndex || {}).filter((fileName) => (
      isProjectFile(fileName) && !rt.drive?.files?.[fileName]
    ));
    hierarchyHydration = (async () => {
      log(`PROJECT: Hydrating ${pending.length} deferred briefcase(s) for the realm browser.`, "log-blue");
      for (const fileName of pending) {
        await window.AIDA_DRIVE?.fetchContextJson?.(fileName);
      }
      mapDriveFilesToMind(rt.drive.files, { selectDefault: false });
      return hierarchy();
    })().finally(() => {
      hierarchyHydration = null;
    });
    return hierarchyHydration;
  }

  function list() {
    return Object.values(runtime().mind.projectLedger || {});
  }

  function currentProviderAllows(project) {
    const active = String(activeLlmProvider() || "").toLowerCase();
    const provider = String(
      project?.llm_provider ||
      project?.llmProvider ||
      project?.llm_scope ||
      project?.llmScope ||
      ""
    ).toLowerCase();
    return !active || !provider || provider === "shared" || provider === active;
  }

  function uniqueValues(...lists) {
    const output = [];
    const seen = new Set();
    lists.flatMap((value) => safeArray(value)).forEach((item) => {
      let key;
      try {
        key = item?.project_file || item?.source_ref || item?.sourceRef || item?.id || JSON.stringify(item);
      } catch (_) {
        key = String(item);
      }
      if (seen.has(key)) return;
      seen.add(key);
      output.push(item);
    });
    return output;
  }

  function projectContentCount(project) {
    if (!project || typeof project !== "object") return 0;
    return [
      project.latest_summary,
      project.summary,
      project.memory,
      project.opening_material,
      ...safeArray(project.adopted_history),
      ...safeArray(project.recent_turns),
      ...safeArray(project.open_threads),
      ...safeArray(project.facts),
      ...safeArray(project.facts_to_consider),
      ...safeArray(project.insights_to_consider)
    ].filter(Boolean).length;
  }

  function projectSnapshot(entry) {
    const rt = runtime();
    const fileName = entry?.fileName || entry?.key;
    const project = rt.mind.projects?.[fileName] || rt.drive?.files?.[fileName] || entry?.summary || {};
    return {
      key: entry?.key || fileName,
      fileName,
      name: valueName(project, entry?.name || fileName),
      realm: project?.realm || project?.realm_name || entry?.realmKey || "UNFILED",
      summary: latestSummary(project) || entry?.status || "No useful summary yet.",
      lastActive: project?.last_active || project?.last_updated || entry?.lastActive || null,
      provider: project?.llm_provider || project?.llmProvider || entry?.llmProvider || null,
      contentCount: projectContentCount(project),
      sourceRefCount: new Set([
        ...safeArray(project?.source_refs),
        ...safeArray(project?.opening_material?.source_refs),
        ...safeArray(project?.adopted_history).map((item) => item?.source_ref).filter(Boolean)
      ]).size,
      openThreadCount: safeArray(project?.open_threads).length,
      project
    };
  }

  const PORTFOLIO_STOP_WORDS = new Set([
    "about", "after", "again", "also", "and", "because", "been", "before", "being",
    "both", "could", "from", "have", "into", "more", "only", "other", "project",
    "should", "that", "their", "there", "these", "this", "through", "under", "using",
    "what", "when", "where", "which", "with", "would", "aida", "francisco"
  ]);

  function portfolioText(snapshot) {
    const project = snapshot?.project || {};
    return [
      snapshot?.name,
      snapshot?.summary,
      project.latest_status,
      project.description,
      project.goal,
      project.goals,
      project.next_steps,
      project.open_threads,
      project.facts,
      project.facts_to_consider,
      project.insights_to_consider,
      project.reconciled_summaries
    ].flat(Infinity).filter(Boolean).map((item) => (
      typeof item === "string"
        ? item
        : item?.thread || item?.text || item?.summary || item?.goal || JSON.stringify(item)
    )).join(" ");
  }

  function portfolioCoreTokens(snapshot) {
    const project = snapshot?.project || {};
    return new Set(
      [
        snapshot?.name,
        snapshot?.summary,
        project.latest_status,
        project.description,
        project.goal,
        project.goals,
        project.next_steps,
        project.facts,
        project.facts_to_consider,
        project.insights_to_consider
      ].flat(Infinity).filter(Boolean).map((item) => (
        typeof item === "string" ? item : item?.text || item?.summary || item?.goal || JSON.stringify(item)
      )).join(" ").toLowerCase().match(/[a-z0-9]{4,}/g) || []
    );
  }

  function portfolioTokens(snapshot) {
    return new Set(
      (portfolioText(snapshot).toLowerCase().match(/[a-z0-9]{4,}/g) || [])
        .filter((token) => !PORTFOLIO_STOP_WORDS.has(token))
    );
  }

  function sharedPortfolioTokens(left, right) {
    const a = portfolioTokens(left);
    const b = portfolioTokens(right);
    return [...a].filter((token) => b.has(token));
  }

  function mentionsProject(text, snapshot) {
    const haystack = keyName(text);
    const nameTokens = [...similarityTokens(snapshot?.name || "")];
    return nameTokens.length > 0 && nameTokens.every((token) => haystack.includes(token));
  }

  function explicitRelationship(left, right) {
    const leftText = portfolioText(left);
    const rightText = portfolioText(right);
    const dependencyPattern = /\b(?:depends? on|requires?|needs?|blocked by|waiting (?:on|for)|after|before)\b/i;
    const conflictPattern = /\b(?:conflicts? with|incompatible|contradicts?|cannot coexist|mutually exclusive)\b/i;
    if (mentionsProject(leftText, right) && conflictPattern.test(leftText)) {
      return { type: "conflict", direction: `${left.fileName}->${right.fileName}` };
    }
    if (mentionsProject(rightText, left) && conflictPattern.test(rightText)) {
      return { type: "conflict", direction: `${right.fileName}->${left.fileName}` };
    }
    if (mentionsProject(leftText, right) && dependencyPattern.test(leftText)) {
      return { type: "dependency", direction: `${left.fileName}->${right.fileName}` };
    }
    if (mentionsProject(rightText, left) && dependencyPattern.test(rightText)) {
      return { type: "dependency", direction: `${right.fileName}->${left.fileName}` };
    }
    return null;
  }

  function relationshipRecommendation(type) {
    if (type === "dependency") return "sequence_and_link";
    if (type === "conflict") return "review_before_linking";
    if (type === "consolidation") return "compare_for_consolidation";
    if (type === "synergy") return "link_and_coordinate";
    return "keep_related";
  }

  function portfolioRelationship(left, right) {
    const shared = sharedPortfolioTokens(left, right);
    const smaller = Math.max(1, Math.min(portfolioTokens(left).size, portfolioTokens(right).size));
    const overlap = shared.length / smaller;
    const explicit = explicitRelationship(left, right);
    let type = explicit?.type || null;
    if (!type && overlap >= 0.62) type = "consolidation";
    if (!type && overlap >= 0.24) type = "synergy";
    if (!type && overlap >= 0.12) type = "reference";
    if (!type) return null;
    return {
      id: `relationship_${keyName(left.fileName)}_${keyName(right.fileName)}`,
      type,
      projects: [
        { fileName: left.fileName, name: left.name, realm: left.realm },
        { fileName: right.fileName, name: right.name, realm: right.realm }
      ],
      direction: explicit?.direction || null,
      confidence: overlap >= 0.5 || explicit ? "strong" : overlap >= 0.24 ? "moderate" : "tentative",
      overlap: Number(overlap.toFixed(2)),
      evidence: shared.slice(0, 8),
      recommendation: relationshipRecommendation(type)
    };
  }

  function spinOffSuggestions(snapshot) {
    const threads = safeArray(snapshot?.project?.open_threads);
    const projectTerms = portfolioCoreTokens(snapshot);
    return threads
      .map((thread, index) => {
        const text = typeof thread === "string" ? thread : thread?.thread || thread?.text || "";
        const tokens = new Set((String(text).toLowerCase().match(/[a-z0-9]{4,}/g) || []).filter((token) => !PORTFOLIO_STOP_WORDS.has(token)));
        const shared = [...tokens].filter((token) => projectTerms.has(token));
        const distinct = [...tokens].filter((token) => !projectTerms.has(token));
        if (tokens.size < 5 || distinct.length < 3 || shared.length > distinct.length) return null;
        return {
          id: `spinoff_${keyName(snapshot.fileName)}_${index + 1}`,
          type: "spin_off",
          project: { fileName: snapshot.fileName, name: snapshot.name, realm: snapshot.realm },
          thread: text,
          confidence: distinct.length >= 6 ? "moderate" : "tentative",
          evidence: distinct.slice(0, 8),
          recommendation: "consider_new_briefcase"
        };
      })
      .filter(Boolean);
  }

  async function portfolioGlance(options = {}) {
    await hydrateHierarchy();
    const overview = memoryOverview({ limit: 50 });
    const projects = overview.projects;
    const relationships = [];
    for (let i = 0; i < projects.length; i += 1) {
      for (let j = i + 1; j < projects.length; j += 1) {
        const relationship = portfolioRelationship(projects[i], projects[j]);
        if (relationship) relationships.push(relationship);
      }
    }
    relationships.sort((a, b) => (
      ({ strong: 3, moderate: 2, tentative: 1 }[b.confidence] || 0) -
      ({ strong: 3, moderate: 2, tentative: 1 }[a.confidence] || 0) ||
      b.overlap - a.overlap
    ));
    const spinOffs = projects.flatMap(spinOffSuggestions);
    const result = {
      ready: true,
      reviewedAt: new Date().toISOString(),
      provider: activeLlmProvider(),
      projectCount: projects.length,
      relationshipCount: relationships.length,
      relationships: relationships.slice(0, Number(options.limit || 6)),
      spinOffs: spinOffs.slice(0, 3)
    };
    runtime().context.lastPortfolioGlance = result;
    runtime().context.pendingPortfolioRelationships = result.relationships;
    return result;
  }

  function stageProjectRelationship(index = 1) {
    const rt = runtime();
    const suggestions = safeArray(rt.context?.pendingPortfolioRelationships);
    const relationship = suggestions[Math.max(0, Number(index || 1) - 1)];
    if (!relationship) return { ok: false, reason: "suggestion_not_found" };
    if (relationship.type === "conflict") return { ok: false, reason: "conflict_requires_review", relationship };
    const [leftRef, rightRef] = relationship.projects || [];
    const left = rt.drive?.files?.[leftRef?.fileName] || rt.mind?.projects?.[leftRef?.fileName];
    const right = rt.drive?.files?.[rightRef?.fileName] || rt.mind?.projects?.[rightRef?.fileName];
    if (!left || !right) return { ok: false, reason: "project_not_loaded" };
    if (!currentProviderAllows(left) || !currentProviderAllows(right)) {
      return { ok: false, reason: "llm_scope_mismatch" };
    }
    const linkedAt = new Date().toISOString();
    const linkFor = (other) => ({
      project_file: other.fileName,
      project_name: other.name,
      relationship: relationship.type,
      direction: relationship.direction,
      evidence: relationship.evidence,
      linked_at: linkedAt,
      source: "portfolio_glance_confirmation"
    });
    const nextLeft = {
      ...left,
      related_projects: uniqueValues(left.related_projects, [linkFor(rightRef)]),
      last_updated: linkedAt
    };
    const nextRight = {
      ...right,
      related_projects: uniqueValues(right.related_projects, [linkFor(leftRef)]),
      last_updated: linkedAt
    };
    rt.drive.files[leftRef.fileName] = nextLeft;
    rt.drive.files[rightRef.fileName] = nextRight;
    rt.driveWriteback = rt.driveWriteback || {};
    rt.driveWriteback.projectRelationshipUpdates = safeArray(rt.driveWriteback.projectRelationshipUpdates);
    rt.driveWriteback.projectRelationshipUpdates.push({
      id: `portfolio_link_${Date.now()}`,
      createdAt: linkedAt,
      relationship,
      files: [
        { fileName: leftRef.fileName, content: nextLeft },
        { fileName: rightRef.fileName, content: nextRight }
      ],
      status: "staged"
    });
    mapDriveFilesToMind(rt.drive.files, { selectDefault: false });
    window.AIDA_CRASH_BUFFER?.checkpoint?.("project_relationship_staged");
    return { ok: true, relationship, stagedForCommit: true };
  }

  function clearPortfolioSuggestions() {
    const hadSuggestions = safeArray(runtime().context?.pendingPortfolioRelationships).length > 0;
    runtime().context.pendingPortfolioRelationships = [];
    return hadSuggestions;
  }

  function memoryOverview(options = {}) {
    const rt = runtime();
    const projects = Object.values(rt.mind.projectLedger || {})
      .map(projectSnapshot)
      .filter((item) => !isSupersededProject(item.project))
      .filter((item) => currentProviderAllows(item.project))
      .sort((a, b) => String(b.lastActive || "").localeCompare(String(a.lastActive || "")));
    const activeFile = rt.context?.activeProjectName || null;
    return {
      provider: activeLlmProvider(),
      activeProject: projects.find((item) => item.key === activeFile || item.fileName === activeFile) || null,
      projectCount: projects.length,
      projects: projects.slice(0, Number(options.limit || 8)),
      realmCount: Object.keys(rt.mind.realmLedger || {}).length
    };
  }

  function similarityTokens(value) {
    return new Set(
      String(value || "")
        .toLowerCase()
        .replace(/project_briefcase_|briefcase_|project_|\.json/g, " ")
        .match(/[a-z0-9]{3,}/g) || []
    );
  }

  function projectMatchScore(query, entry) {
    const wanted = similarityTokens(query);
    const available = similarityTokens(`${entry?.name || ""} ${entry?.fileName || ""}`);
    if (!wanted.size) return 0;
    let overlap = 0;
    wanted.forEach((token) => {
      if (available.has(token)) overlap += 1;
    });
    return overlap / wanted.size;
  }

  async function compareProjects(query = "") {
    await hydrateHierarchy();
    const entries = Object.values(runtime().mind.projectLedger || {})
      .filter((entry) => currentProviderAllows(projectSnapshot(entry).project));
    const ranked = entries
      .map((entry) => ({ entry, score: projectMatchScore(query, entry) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || String(b.entry.lastActive || "").localeCompare(String(a.entry.lastActive || "")));
    const strongest = ranked[0]?.score || 0;
    const candidates = ranked
      .filter((item) => item.score >= Math.max(0.2, strongest - 0.2))
      .slice(0, 4)
      .map((item) => projectSnapshot(item.entry));
    if (candidates.length < 2) {
      return { ok: false, reason: "fewer_than_two_matches", candidates };
    }

    const recommended = candidates
      .slice()
      .sort((a, b) => {
        const aFiled = keyName(a.realm) !== "unknown" && keyName(a.realm) !== "unfiled" ? 1 : 0;
        const bFiled = keyName(b.realm) !== "unknown" && keyName(b.realm) !== "unfiled" ? 1 : 0;
        return bFiled - aFiled || b.contentCount - a.contentCount || String(b.lastActive || "").localeCompare(String(a.lastActive || ""));
      })[0];
    const duplicate = candidates.find((item) => item.fileName !== recommended.fileName);
    const comparison = {
      ok: true,
      query,
      comparedAt: new Date().toISOString(),
      candidates,
      recommendedSurvivor: recommended,
      recommendedDuplicate: duplicate
    };
    runtime().context.pendingProjectReconciliation = {
      id: `reconcile_${Date.now()}`,
      createdAt: comparison.comparedAt,
      survivorFile: recommended.fileName,
      duplicateFile: duplicate.fileName,
      comparison
    };
    return comparison;
  }

  async function summarizeProject(query = "") {
    await hydrateHierarchy();
    const match = Object.values(runtime().mind.projectLedger || {})
      .filter((entry) => currentProviderAllows(projectSnapshot(entry).project))
      .map((entry) => ({ snapshot: projectSnapshot(entry), score: projectMatchScore(query, entry) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || String(b.snapshot.lastActive || "").localeCompare(String(a.snapshot.lastActive || "")))[0];
    if (!match) return { ok: false, reason: "project_not_found" };
    return { ok: true, ...match.snapshot };
  }

  function mergeProjectPayloads(survivor, duplicate, survivorFile, duplicateFile) {
    const mergedAt = new Date().toISOString();
    return {
      ...duplicate,
      ...survivor,
      project_name: valueName(survivor, valueName(duplicate, survivorFile)),
      name: valueName(survivor, valueName(duplicate, survivorFile)),
      realm: survivor?.realm || duplicate?.realm || "UNFILED",
      status: "active",
      archived: false,
      superseded_by: null,
      latest_summary: latestSummary(survivor) || latestSummary(duplicate) || null,
      reconciled_summaries: uniqueValues(
        survivor?.reconciled_summaries,
        duplicate?.reconciled_summaries,
        [latestSummary(survivor), latestSummary(duplicate)].filter(Boolean)
      ),
      adopted_history: uniqueValues(survivor?.adopted_history, duplicate?.adopted_history),
      recent_turns: uniqueValues(survivor?.recent_turns, duplicate?.recent_turns).slice(-40),
      open_threads: uniqueValues(survivor?.open_threads, duplicate?.open_threads),
      facts: uniqueValues(survivor?.facts, duplicate?.facts),
      facts_to_consider: uniqueValues(survivor?.facts_to_consider, duplicate?.facts_to_consider),
      insights_to_consider: uniqueValues(survivor?.insights_to_consider, duplicate?.insights_to_consider),
      sensitive_context_to_consider: uniqueValues(survivor?.sensitive_context_to_consider, duplicate?.sensitive_context_to_consider),
      emotional_notes: uniqueValues(survivor?.emotional_notes, duplicate?.emotional_notes),
      source_refs: uniqueValues(
        survivor?.source_refs,
        duplicate?.source_refs,
        survivor?.opening_material?.source_refs,
        duplicate?.opening_material?.source_refs
      ),
      reconciliation: {
        ...(survivor?.reconciliation || {}),
        merged_at: mergedAt,
        merged_from: uniqueValues(survivor?.reconciliation?.merged_from, [duplicateFile]),
        survivor_file: survivorFile,
        policy: "merge_then_archive_duplicate"
      },
      last_updated: mergedAt
    };
  }

  function confirmProjectReconciliation() {
    const rt = runtime();
    const pending = rt.context?.pendingProjectReconciliation;
    if (!pending?.survivorFile || !pending?.duplicateFile) {
      return { ok: false, reason: "no_pending_reconciliation" };
    }
    const survivor = rt.drive?.files?.[pending.survivorFile] || rt.mind?.projects?.[pending.survivorFile];
    const duplicate = rt.drive?.files?.[pending.duplicateFile] || rt.mind?.projects?.[pending.duplicateFile];
    if (!survivor || !duplicate) return { ok: false, reason: "project_not_loaded" };
    if (!currentProviderAllows(survivor) || !currentProviderAllows(duplicate)) {
      return { ok: false, reason: "llm_scope_mismatch" };
    }

    const merged = mergeProjectPayloads(survivor, duplicate, pending.survivorFile, pending.duplicateFile);
    const archivedAt = new Date().toISOString();
    const archived = {
      ...duplicate,
      status: "superseded",
      archived: true,
      superseded_by: pending.survivorFile,
      superseded_at: archivedAt,
      reconciliation: {
        ...(duplicate?.reconciliation || {}),
        archived_at: archivedAt,
        survivor_file: pending.survivorFile,
        recovery: "Remove archived/superseded fields to restore this briefcase."
      },
      last_updated: archivedAt
    };
    rt.drive.files[pending.survivorFile] = merged;
    rt.drive.files[pending.duplicateFile] = archived;
    rt.driveWriteback = rt.driveWriteback || {};
    rt.driveWriteback.projectReconciliations = safeArray(rt.driveWriteback.projectReconciliations);
    rt.driveWriteback.projectReconciliations.push({
      id: pending.id,
      createdAt: archivedAt,
      survivorFile: pending.survivorFile,
      duplicateFile: pending.duplicateFile,
      survivor: merged,
      duplicate: archived,
      status: "staged"
    });
    rt.context.pendingProjectReconciliation = null;
    mapDriveFilesToMind(rt.drive.files, { selectDefault: false });
    select(pending.survivorFile);
    window.AIDA_CRASH_BUFFER?.checkpoint?.("project_reconciliation_staged");
    log(`PROJECT: Reconciled ${pending.duplicateFile} into ${pending.survivorFile}; duplicate archived.`, "log-blue");
    return {
      ok: true,
      survivorFile: pending.survivorFile,
      duplicateFile: pending.duplicateFile,
      projectName: valueName(merged, pending.survivorFile),
      stagedForCommit: true
    };
  }

  function cancelProjectReconciliation() {
    const hadPending = Boolean(runtime().context?.pendingProjectReconciliation);
    runtime().context.pendingProjectReconciliation = null;
    return hadPending;
  }

  function findByName(name, kind = "project") {
    const wanted = keyName(name);
    const entries = kind === "realm"
      ? Object.values(runtime().mind.realmLedger || {})
      : Object.values(runtime().mind.projectLedger || {});
    return entries.find((entry) => (
      keyName(entry.key) === wanted ||
      keyName(entry.fileName) === wanted ||
      keyName(entry.name) === wanted
    )) || entries.find((entry) => keyName(entry.name).includes(wanted)) || null;
  }

  async function openNamed(name, kind = "project") {
    const entry = findByName(name, kind);
    if (!entry) return null;
    const selected = await selectHydrated(entry.key || entry.fileName);
    return selected ? { entry, selected } : null;
  }

  function returnContext(provider = activeLlmProvider()) {
    const rt = runtime();
    const normalizedProvider = String(provider || "").toLowerCase();
    const ledger = Object.values(rt.mind.projectLedger || {});
    const rawStore = rt.drive?.files?.["raw_session_log.json"];
    const rawRecords = safeArray(rawStore?.entries || rawStore);
    const candidates = [];

    rawRecords.forEach((record) => {
      const tags = record?.tags || {};
      const recordProvider = String(record?.llm_provider || tags.llm_provider || "").toLowerCase();
      const projectFile = record?.project_file || tags.project_file || null;
      const projectName = record?.project || tags.project || null;
      if (!recordProvider || recordProvider !== normalizedProvider) return;
      if (!projectFile || projectFile === "none" || isGenericRpg(projectName) || keyName(projectName) === "unknown_project") return;
      const entry = ledger.find((item) => (
        item.fileName === projectFile ||
        item.key === projectFile ||
        keyName(item.name) === keyName(projectName)
      ));
      if (!entry) return;
      candidates.push({
        entry,
        at: record?.capturedAt || record?.captured_at || record?.last_seen || entry.lastActive || ""
      });
    });

    ledger.forEach((entry) => {
      const entryProvider = String(
        entry.llmProvider ||
        entry.summary?.llm_provider ||
        entry.summary?.llmProvider ||
        ""
      ).toLowerCase();
      if (entryProvider && entryProvider === normalizedProvider) {
        candidates.push({ entry, at: entry.lastActive || "" });
      }
    });

    const chosen = candidates
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))[0]?.entry || null;
    if (!chosen) return null;
    const realmEntry = Object.values(rt.mind.realmLedger || {}).find((realm) => realm.realmKey === chosen.realmKey) || null;
    const storedProject = rt.mind.projects?.[chosen.fileName] || chosen.summary || {};
    const projectPayload = {
      ...(storedProject && typeof storedProject === "object" ? storedProject : {}),
      project_name: valueName(storedProject, chosen.name),
      realm: storedProject?.realm || realmEntry?.name || null
    };
    const result = {
      provider: normalizedProvider,
      projectKey: chosen.key,
      projectFile: chosen.fileName,
      projectName: chosen.name,
      project: projectPayload,
      realmKey: realmEntry?.key || null,
      realmName: realmEntry?.name || projectPayload?.realm || null,
      realm: realmEntry?.summary || null,
      lastActive: chosen.lastActive || null
    };
    rt.context.proposedReturnContext = result;
    return result;
  }

  async function acceptReturnContext() {
    const rt = runtime();
    const proposed = rt.context?.proposedReturnContext;
    if (!proposed?.projectKey) return null;
    const selected = await selectHydrated(proposed.projectKey);
    if (!selected) return null;
    rt.context.proposedReturnContext = null;
    return {
      selected,
      projectName: proposed.projectName,
      realmName: proposed.realmName
    };
  }

  function dismissReturnContext() {
    runtime().context.proposedReturnContext = null;
    return true;
  }

  async function claimProject(projectName, realmName) {
    const rt = runtime();
    const projectEntry = findByName(projectName, "project");
    const realmEntry = findByName(realmName, "realm");
    if (!projectEntry) return { ok: false, reason: "project_not_found" };
    if (!realmEntry) return { ok: false, reason: "realm_not_found" };

    if (needsHydration(projectEntry.key || projectEntry.fileName)) {
      await window.AIDA_DRIVE?.fetchContextJson?.(projectEntry.key || projectEntry.fileName);
      mapDriveFilesToMind(rt.drive.files, { selectDefault: false });
    }

    const refreshed = findByName(projectName, "project") || projectEntry;
    const fileName = refreshed.fileName || refreshed.key;
    const project = rt.mind.projects?.[fileName] || rt.drive?.files?.[fileName] || refreshed.summary;
    if (!project || typeof project !== "object") {
      return { ok: false, reason: "project_not_loaded" };
    }

    const claimedAt = new Date().toISOString();
    project.realm = realmEntry.name;
    project.realm_file = realmEntry.fileName;
    project.last_updated = claimedAt;
    project.migration = {
      ...(project.migration || {}),
      realm_claimed_at: claimedAt,
      realm_claimed_via: "conversation_command"
    };
    rt.drive.files[fileName] = project;
    rt.mind.projects[fileName] = project;

    const ledgerEntry = rt.mind.projectLedger[refreshed.key] || rt.mind.projectLedger[fileName];
    if (ledgerEntry) {
      ledgerEntry.realmKey = realmEntry.realmKey;
      ledgerEntry.summary = project;
      ledgerEntry.loaded = true;
      ledgerEntry.fileName = fileName;
      ledgerEntry.lastActive = claimedAt;
    }

    select(refreshed.key || fileName);
    rt.context.projectMode = project?.draft?.status === "runtime_only" ? "new_project_draft" : "project_payload";
    rt.context.projectRealmClaim = {
      fileName,
      projectName: valueName(project, refreshed.name),
      realmName: realmEntry.name,
      claimedAt
    };
    window.AIDA_CRASH_BUFFER?.checkpoint?.("project_realm_claimed");
    log(`PROJECT: Claimed ${valueName(project, refreshed.name)} under realm ${realmEntry.name}.`, "log-blue");
    return {
      ok: true,
      projectName: valueName(project, refreshed.name),
      realmName: realmEntry.name,
      fileName
    };
  }

  function hierarchy() {
    const rt = runtime();
    const realms = Object.values(rt.mind.realmLedger || {});
    const projects = Object.values(rt.mind.projectLedger || {});
    const groups = realms.map((realm) => ({
      ...realm,
      active: keyName(rt.context?.activeRealmName) === keyName(realm.key),
      projects: projects
        .filter((project) => project.realmKey === realm.realmKey)
        .map((project) => ({
          ...project,
          active: rt.context?.activeProjectName === project.key
        }))
    }));
    const assigned = new Set(groups.flatMap((realm) => realm.projects.map((project) => project.key)));
    const unassigned = projects.filter((project) => (
      !assigned.has(project.key) &&
      !["unknown_project", "rpg"].includes(keyName(project.name || project.key))
    ));
    if (unassigned.length) {
      groups.push({
        key: "unknown_realm",
        realmKey: "unknown",
        name: "UNFILED",
        kind: "realm",
        source: "synthetic",
        loaded: true,
        active: false,
        projects: unassigned.map((project) => ({
          ...project,
          active: rt.context?.activeProjectName === project.key
        }))
      });
    }
    return groups;
  }

  function mapDriveFilesToMind(files = runtime().drive?.files || {}, options = {}) {
    const rt = runtime();
    const selectDefault = options.selectDefault !== false;

    rt.mind.identity = files["core_identity.json"] || null;
    rt.mind.memory = files["memory_summary.json"] || null;
    rt.mind.facts = files["facts.json"] || null;
    rt.mind.insights = files["insights.json"] || null;
    rt.mind.emotion = files["emotion_state.json"] || null;
    rt.mind.session = files["session_log.json"] || null;
    rt.mind.whileAway = files["while_away_thoughts.json"] || null;
    rt.tokens.openai.fragments = files["openai_fragments.json"] || null;
    rt.tokens.llm.fragments = files["llm_fragments.json"] || rt.tokens.openai.fragments || null;

    rt.mind.realms = Object.fromEntries(Object.entries(files).filter(([name]) => isRealmFile(name)));
    rt.mind.roles = Object.fromEntries(Object.entries(files).filter(([name]) => name.startsWith("role_")));
    rt.mind.projects = Object.fromEntries(Object.entries(files).filter(([name]) => isProjectFile(name)));
    rt.mind.projectSummariesIndex = normalizeProjectIndex(files);
    rt.mind.projectLedger = buildProjectLedger(files, rt.mind.projects, rt.mind.realms);
    rt.mind.realmLedger = buildRealmLedger(rt.mind.realms);

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
      : Object.keys(rt.mind.projectLedger)[0] || Object.keys(rt.mind.projects)[0] || activeRealmName || null;

    rt.context.identity = rt.mind.identity;
    if (selectDefault) rt.context.realm = rt.mind.realm;
    if (selectDefault) rt.context.role = rt.mind.role;
    rt.context.emotion = rt.mind.emotion;
    if (selectDefault) {
      select(activeProjectName);
      rt.context.memoryWindow = {
        recentTurns: rt.context.projectRecentTurns || files["recent_turns.json"] || null,
        session: rt.mind.session,
        summary: rt.context.projectMemory || rt.mind.memory
      };
    }

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
      realmLedger: Object.keys(rt.mind.realmLedger).length,
      activeProject: Boolean(rt.context.project)
    };
  }

  window.AIDA_PROJECTS = {
    list,
    hierarchy,
    hierarchyNeedsHydration,
    hydrateHierarchy,
    findByName,
    openNamed,
    returnContext,
    acceptReturnContext,
    dismissReturnContext,
    claimProject,
    memoryOverview,
    portfolioGlance,
    stageProjectRelationship,
    clearPortfolioSuggestions,
    summarizeProject,
    compareProjects,
    confirmProjectReconciliation,
    cancelProjectReconciliation,
    select,
    selectHydrated,
    createDraft,
    adoptHistory,
    suggestUnnamedStory,
    consumeUnnamedStoryTitle,
    recentAdoptableHistory,
    mapDriveFilesToMind,
    valueName
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "project_context",
      reads: ["AIDA_RUNTIME.drive.files"],
      writes: ["AIDA_RUNTIME.mind.projectLedger", "AIDA_RUNTIME.context.project", "AIDA_RUNTIME.context.newProjectDraft"],
      requires: ["AIDA_RUNTIME"],
      verifies: ["project menus, conversational project drafts, and active context are owned by the spine project context organ"]
    });
  }
})();
