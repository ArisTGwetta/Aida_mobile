(function () {
  const MODULE_ID = "spine.project.context";

  function runtime() {
    return window.AIDA_RUNTIME;
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
      if (projects[`${candidate}.json`]) return `${candidate}.json`;
      if (realms[`${candidate}.json`]) return `${candidate}.json`;
      if (realms[`realm_${candidate}.json`]) return `realm_${candidate}.json`;
      if (realms[`REALM_${candidate}.json`]) return `REALM_${candidate}.json`;
    }

    const foldedKey = projectKey.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const allNames = [...Object.keys(projects), ...Object.keys(realms)];
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

      ledger[projectKey] = {
        key: projectKey,
        name,
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

      ledger[activityName] = {
        key: activityName,
        name: activityName,
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
        source: "project_payload",
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
        source: "realm_fallback",
        status: textFrom(realm?.project_summary || realm?.summary || activity?.one_liner || activity, 160),
        lastActive: realm?.last_active || realm?.last_updated || activity?.last_active || null,
        loaded: true,
        fileName
      };
    }

    return ledger;
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
    const ledgerEntry = selectedKey ? ledger[selectedKey] || null : null;
    const loadName = ledgerEntry?.fileName || selectedKey;
    const selected = loadName ? projects[loadName] || realms[loadName] || ledgerEntry?.summary || null : null;
    const isDedicatedProject = Boolean(loadName && projects[loadName]);
    const isRealmContext = Boolean(loadName && realms[loadName] && !isDedicatedProject);

    if (isRealmContext) rt.mind.realm = selected;
    rt.mind.activeProject = isDedicatedProject ? selected : null;
    rt.mind.activeProjectName = selectedKey;

    rt.context.realm = isRealmContext ? selected : rt.mind.realm;
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
        name: selected ? valueName(selected, ledgerEntry?.name || selectedKey) : null
      }
    }));

    return selected;
  }

  function list() {
    return Object.values(runtime().mind.projectLedger || {});
  }

  function mapDriveFilesToMind(files = runtime().drive?.files || {}) {
    const rt = runtime();

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
    rt.context.realm = rt.mind.realm;
    rt.context.role = rt.mind.role;
    rt.context.emotion = rt.mind.emotion;
    select(activeProjectName);
    rt.context.memoryWindow = {
      recentTurns: rt.context.projectRecentTurns || files["recent_turns.json"] || null,
      session: rt.mind.session,
      summary: rt.context.projectMemory || rt.mind.memory
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
      activeProject: Boolean(rt.context.project)
    };
  }

  window.AIDA_PROJECTS = {
    list,
    select,
    mapDriveFilesToMind,
    valueName
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "project_context",
      reads: ["AIDA_RUNTIME.drive.files"],
      writes: ["AIDA_RUNTIME.mind.projectLedger", "AIDA_RUNTIME.context.project"],
      requires: ["AIDA_RUNTIME"],
      verifies: ["project menus and active context are owned by the spine project context organ"]
    });
  }
})();
