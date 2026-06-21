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
      const name = valueName(projectData, projectKey);
      const loadFileName = findLoadFileForProject(projectKey, projectData, projects, realms);
      if (loadFileName && (realms[loadFileName] || isRealmFile(loadFileName))) continue;

      ledger[projectKey] = {
        key: projectKey,
        name,
        kind: "project",
        realmKey: keyName(projectData?.realm || projectData?.realm_name || "unknown"),
        source: "project_index",
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
      if (loadFileName && (realms[loadFileName] || isRealmFile(loadFileName))) continue;

      ledger[activityName] = {
        key: activityName,
        name: activityName,
        kind: "project",
        realmKey: keyName(activity?.realm || activity?.realm_name || "unknown"),
        source: "recent_activity",
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

      if (ledger[fileName]) continue;
      ledger[fileName] = {
        key: fileName,
        name,
        kind: "project",
        realmKey: keyName(project?.realm || project?.realm_name || "unknown"),
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
    const rt = runtime();
    const projectName = rt.context?.projectName;
    const projectMode = rt.context?.projectMode;
    if (
      projectMode !== "realm_context" ||
      rt.context?.activeProjectName ||
      !isGenericRpg(projectName)
    ) return null;

    const boundary = Number(rt.context?.unnamedStoryBoundaryTurn || 0);
    const provider = activeLlmProvider();
    const records = safeArray(rt.session?.currentTurns)
      .slice(boundary)
      .filter((record) => isAdoptableRecord(record, provider))
      .map(historyRecord)
      .slice(-6);
    if (records.length < 3) return null;
    const signature = records.map((item) => item.source_ref).join("|");
    if (rt.context?.lastUnnamedStorySuggestion === signature) return null;
    const storyText = records.map((item) => `${item.user} ${item.aida}`).join(" ");
    if (!/\b(story|bard|angel|guide|character|king|queen|love|door|quest|dragon|magic|frozen|scene)\b/i.test(storyText)) {
      return null;
    }

    rt.context.lastUnnamedStorySuggestion = signature;
    const hint = openingHint(records) || "the story we have been shaping";
    rt.context.pendingUnnamedStory = {
      signature,
      provider: activeLlmProvider(),
      count: records.length,
      hint,
      offeredAt: new Date().toISOString()
    };
    return {
      text: `This feels like the beginning of a story we have not named yet—something around ${hint}. Do you have a title for it?`,
      count: records.length,
      provider: activeLlmProvider(),
      hint
    };
  }

  function consumeUnnamedStoryTitle(text) {
    const rt = runtime();
    const pending = rt.context?.pendingUnnamedStory;
    if (!pending || pending.provider !== activeLlmProvider()) return null;
    const raw = String(text || "").trim();
    if (!raw) return null;
    if (/^(?:no|not yet|maybe later|let me think|skip|cancel)\b/i.test(raw)) {
      rt.context.pendingUnnamedStory = null;
      return { handled: false, declined: true };
    }
    if (raw.length > 90 || raw.split(/\s+/).length > 14 || /\?$/.test(raw)) return null;

    const title = raw
      .replace(/^["“”']|["“”']$/g, "")
      .replace(/^(?:call it|let'?s call it|the title is|title:)\s*/i, "")
      .trim();
    if (title.length < 2) return null;

    const created = createDraft(title, { realm: "RPG" });
    const adopted = adoptHistory();
    rt.context.pendingUnnamedStory = null;
    return {
      handled: true,
      created,
      adopted,
      title: valueName(created.project, title)
    };
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

  function list() {
    return Object.values(runtime().mind.projectLedger || {});
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
    const unassigned = projects.filter((project) => !assigned.has(project.key));
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
    findByName,
    openNamed,
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
