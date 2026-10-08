// AIDA REVIEW BLOCK 1: File header - AIDA_ONE_SPINE\spine\context_inspector.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
(function () {
  const MODULE_ID = "spine.context.inspector";

// AIDA REVIEW BLOCK 3: Function $ - callable behavior in this runtime organ.
  function $(id) {
    return document.getElementById(id);
  }

// AIDA REVIEW BLOCK 4: Function runtime - callable behavior in this runtime organ.
  function runtime() {
    return window.AIDA_RUNTIME;
  }

// AIDA REVIEW BLOCK 5: Function log - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 6: Function valueName - callable behavior in this runtime organ.
  function valueName(value) {
    if (!value || typeof value !== "object") return null;
// AIDA REVIEW BLOCK 7: Function direct - arrow-function behavior in this runtime organ.
    const direct = (
      value.name ||
      value.display_name ||
      value.displayName ||
      value.realm_name ||
      value.role_name ||
      value.identity_name ||
      value.project_name ||
      value.briefcase_title ||
      value.briefcase_id ||
      value.title ||
      value.label ||
      value.id ||
      value.filename ||
      value.briefcase_name ||
      null
    );

    if (direct) return direct;

    const nestedKeys = ["identity", "realm", "role", "project", "briefcase"];
    for (const key of nestedKeys) {
      const nested = value[key];
      if (nested && typeof nested === "object") {
        const nestedName = valueName(nested);
        if (nestedName) return nestedName;
      }
    }

    return null;
  }

// AIDA REVIEW BLOCK 8: Function directNameCandidates - callable behavior in this runtime organ.
  function directNameCandidates(value) {
    if (!value || typeof value !== "object") return {};
    const candidateKeys = [
      "name",
      "display_name",
      "displayName",
      "title",
      "label",
      "id",
      "filename",
      "briefcase_name",
      "briefcase_title",
      "briefcase_id",
      "realm_name",
      "role_name",
      "identity_name",
      "project_name"
    ];

    const nameCandidates = {};
    for (const key of candidateKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const raw = value[key];
        nameCandidates[key] = typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean"
          ? String(raw).slice(0, 80)
          : `[${Array.isArray(raw) ? "array" : typeof raw}]`;
      }
    }

    return nameCandidates;
  }

// AIDA REVIEW BLOCK 9: Function legacyValueName - callable behavior in this runtime organ.
  function legacyValueName(value) {
    if (!value || typeof value !== "object") return null;
    return (
      value.name ||
      value.display_name ||
      value.displayName ||
      value.realm_name ||
      value.role_name ||
      value.identity_name ||
      value.project_name ||
      value.briefcase_title ||
      value.briefcase_id ||
      value.title ||
      value.label ||
      value.id ||
      value.filename ||
      value.briefcase_name ||
      null
    );
  }

// AIDA REVIEW BLOCK 10: Function safeShape - callable behavior in this runtime organ.
  function safeShape(name, value) {
    if (!value || typeof value !== "object") {
      return { name, present: false, keys: [], nameCandidates: {} };
    }

    const nameCandidates = directNameCandidates(value);
    const nestedKeys = ["identity", "realm", "role", "project", "briefcase"];
    const nestedCandidates = {};

    for (const key of nestedKeys) {
      if (value[key] && typeof value[key] === "object") {
        const nested = directNameCandidates(value[key]);
        if (Object.keys(nested).length) {
          nestedCandidates[key] = nested;
        } else {
          nestedCandidates[key] = {
            keys: Object.keys(value[key]).slice(0, 20).join(", ")
          };
        }
      }
    }

    return {
      name,
      present: true,
      keys: Object.keys(value).slice(0, 40),
      nameCandidates,
      nestedCandidates
    };
  }

// AIDA REVIEW BLOCK 11: Function countArrayLike - callable behavior in this runtime organ.
  function countArrayLike(value) {
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") return Object.keys(value).length;
    return 0;
  }

// AIDA REVIEW BLOCK 12: Function findProjectSummaries - callable behavior in this runtime organ.
  function findProjectSummaries(project) {
    if (!project || typeof project !== "object") return 0;
    return findLikelyCount(project, [
      "summaries",
      "summary",
      "project_summary",
      "briefcase_summary",
      "notes",
      "contexts",
      "threads"
    ]);
  }

// AIDA REVIEW BLOCK 13: Function findLikelyCount - callable behavior in this runtime organ.
  function findLikelyCount(obj, keys) {
    if (!obj || typeof obj !== "object") return 0;
    for (const key of keys) {
      if (obj[key]) return countArrayLike(obj[key]);
    }
    return countArrayLike(obj);
  }

// AIDA REVIEW BLOCK 14: Function emotionSummary - callable behavior in this runtime organ.
  function emotionSummary(emotion) {
    if (!emotion || typeof emotion !== "object") return "missing";
    const label = emotion.label || emotion.emotion || emotion.state || "unlabeled";
    const valence = emotion.valence ?? emotion.v ?? "n/a";
    const arousal = emotion.arousal ?? emotion.a ?? "n/a";
    return `${label} (valence=${valence}, arousal=${arousal})`;
  }

// AIDA REVIEW BLOCK 15: Function preLlmGate - callable behavior in this runtime organ.
  function preLlmGate(summary) {
    const missing = [];
    if (!summary.identity.present) missing.push("identity");
    if (!summary.realm.present) missing.push("active realm");
    if (!summary.role.present) missing.push("active role");
    if (!summary.facts.present) missing.push("facts");
    if (!summary.memory.present) missing.push("memory summary");
    if (!summary.emotion.present) missing.push("emotion");

    return {
      pass: missing.length === 0,
      missing
    };
  }

// AIDA REVIEW BLOCK 16: Function buildContextSummary - callable behavior in this runtime organ.
  function buildContextSummary() {
    const rt = runtime();
    const mind = rt.mind || {};
    const context = rt.context || {};
    const driveFiles = rt.drive?.files || {};

    const identity = context.identity || mind.identity;
    const realm = context.realm || mind.realm;
    const role = context.role || mind.role;
    const facts = context.projectFacts || mind.facts;
    const memory = context.projectMemory || context.projectSummaries || mind.memory;
    const emotion = context.emotion || mind.emotion;
    const recentTurns = context.projectRecentTurns || context.memoryWindow?.recentTurns || driveFiles["recent_turns.json"];
    const session = context.memoryWindow?.session || mind.session;
    const interactionRules = context.interactionRules || null;
    const projectMode = context.projectMode || (mind.activeProject ? "briefcase" : "realm_as_project_placeholder");
    const projectLedger = mind.projectLedger || {};
    const projectName = mind.activeProject || context.project
      ? valueName(mind.activeProject || context.project) || "unnamed_project"
      : `realm_as_project: ${valueName(realm) || "unnamed_realm"}`;

    const summary = {
      boot: {
        phase: rt.boot?.phase || "unknown",
        driveConnected: Boolean(rt.boot?.driveConnected),
        driveLoaded: Boolean(rt.boot?.driveLoaded),
        airlockCleared: Boolean(rt.boot?.airlockCleared),
        mindReady: Boolean(rt.boot?.mindReady)
      },
      drive: {
        fileCount: Object.keys(driveFiles).length,
        folderIdPresent: Boolean(rt.drive?.folderId)
      },
      identity: {
        present: Boolean(identity),
        name: valueName(identity) || "unnamed"
      },
      realm: {
        present: Boolean(realm),
        name: valueName(realm) || "unnamed",
        loadedCount: countArrayLike(mind.realms)
      },
      role: {
        present: Boolean(role),
        name: valueName(role) || "unnamed",
        loadedCount: countArrayLike(mind.roles),
        source: context.roleSource || "unknown"
      },
      project: {
        active: Boolean(mind.activeProject || context.project),
        mode: projectMode,
        name: projectName,
        fileName: context.projectName || mind.activeProjectName || "none",
        loadedCount: countArrayLike(mind.projects),
        ledgerCount: countArrayLike(projectLedger),
        summaryCount: findProjectSummaries(mind.activeProject || context.project)
      },
      facts: {
        present: Boolean(facts),
        count: findLikelyCount(facts, ["facts", "items", "user", "system"])
      },
      memory: {
        present: Boolean(memory),
        count: findLikelyCount(memory, ["summaries", "summary", "recent_interactions", "long_term"])
      },
      insights: {
        present: Boolean(mind.insights),
        count: findLikelyCount(mind.insights, ["insights", "themes", "patterns"])
      },
      session: {
        present: Boolean(session),
        count: findLikelyCount(session, ["turns", "recent_turns", "entries", "session_log"])
      },
      recentTurns: {
        present: Boolean(recentTurns),
        count: findLikelyCount(recentTurns, ["turns", "recent_turns", "entries"])
      },
      interactionRules: {
        present: Boolean(interactionRules),
        count: findLikelyCount(interactionRules, ["rules", "interaction_rules", "boundaries", "modes"])
      },
      emotion: {
        present: Boolean(emotion),
        summary: emotionSummary(emotion)
      },
      llm: {
        fragmentsPresent: Boolean(rt.tokens?.llm?.fragments),
        routeCount: rt.tokens?.llm?.fragments?.routes
          ? Object.keys(rt.tokens.llm.fragments.routes).length
          : 0,
        provider: rt.tokens?.llm?.provider || "none",
        profile: rt.tokens?.llm?.profile || "none",
        keyReady: Boolean(rt.tokens?.llm?.key),
        routeReady: Boolean(window.AIDA_LLM_PROVIDER?.readiness?.().pass),
        messagesReady: Array.isArray(rt.context?.llmMessages),
        messageCount: Array.isArray(rt.context?.llmMessages) ? rt.context.llmMessages.length : 0,
        tetradReady: Boolean(rt.context?.tetrad)
      },
      capturedSession: {
        id: rt.session?.id || "none",
        exchanges: rt.session?.exchangeCount || rt.session?.currentTurns?.length || 0,
        unsaved: Boolean(rt.session?.unsaved),
        pendingJournalCount: rt.sleep?.pendingJournal?.length || 0
      },
      whileAway: {
        ready: Boolean(rt.sleep?.whileAway?.ready),
        source: rt.sleep?.whileAway?.source || "none",
        topic: rt.sleep?.whileAway?.topic || "none",
        offered: Boolean(rt.sleep?.whileAway?.offered)
      }
    };

    summary.preLlmGate = preLlmGate(summary);
    return summary;
  }

// AIDA REVIEW BLOCK 17: Function inspectContext - callable behavior in this runtime organ.
  function inspectContext() {
    const summary = buildContextSummary();
    const gate = summary.preLlmGate;

    log("CONTEXT: Safe summary follows.", "log-blue");
    log(`BOOT: phase=${summary.boot.phase}, driveLoaded=${summary.boot.driveLoaded}, airlock=${summary.boot.airlockCleared}`);
    log(`DRIVE: files=${summary.drive.fileCount}, folderId=${summary.drive.folderIdPresent}`);
    log(`IDENTITY: ${summary.identity.present ? summary.identity.name : "missing"}`);
    log(`REALM: ${summary.realm.name} (${summary.realm.loadedCount} loaded)`);
    log(`ROLE: ${summary.role.name} (${summary.role.loadedCount} loaded, source=${summary.role.source})`);
    log(`PROJECT: ${summary.project.name} [${summary.project.mode}] file=${summary.project.fileName} (${summary.project.loadedCount} dedicated, ledger=${summary.project.ledgerCount}, summaries=${summary.project.summaryCount})`);
    log(`FACTS: present=${summary.facts.present}, count=${summary.facts.count}`);
    log(`MEMORY: present=${summary.memory.present}, count=${summary.memory.count}`);
    log(`INSIGHTS: present=${summary.insights.present}, count=${summary.insights.count}`);
    log(`SESSION: present=${summary.session.present}, count=${summary.session.count}`);
    log(`RECENT TURNS: present=${summary.recentTurns.present}, count=${summary.recentTurns.count}`);
    log(`INTERACTION RULES: present=${summary.interactionRules.present}, count=${summary.interactionRules.count}`);
    log(`EMOTION: ${summary.emotion.summary}`);
    log(`LLM ROUTES: fragments=${summary.llm.fragmentsPresent}, routes=${summary.llm.routeCount}, selected=${summary.llm.provider}/${summary.llm.profile}, routeReady=${summary.llm.routeReady}, keyReady=${summary.llm.keyReady}`);
    log(`LLM MESSAGES: ready=${summary.llm.messagesReady}, count=${summary.llm.messageCount}, tetrad=${summary.llm.tetradReady}`);
    log(`CAPTURED SESSION: id=${summary.capturedSession.id}, exchanges=${summary.capturedSession.exchanges}, unsaved=${summary.capturedSession.unsaved}, pendingJournal=${summary.capturedSession.pendingJournalCount}`);
    log(`WHILE AWAY: ready=${summary.whileAway.ready}, source=${summary.whileAway.source}, topic=${summary.whileAway.topic}, offered=${summary.whileAway.offered}`);

    if (gate.pass) {
      log("PRE-LLM GATE: PASS. Required context is present.", "log-blue");
    } else {
      log(`PRE-LLM GATE: WAIT. Missing ${gate.missing.join(", ")}.`, "log-amber");
    }

// AIDA REVIEW BLOCK 18: Browser export AIDA_CONTEXT_SUMMARY - exposes this organ to the page runtime.
    window.AIDA_CONTEXT_SUMMARY = summary;
    return summary;
  }

// AIDA REVIEW BLOCK 19: Function inspectShapes - callable behavior in this runtime organ.
  function inspectShapes() {
    const rt = runtime();
    const files = rt.drive?.files || {};
    const shapes = [
      safeShape("core_identity.json", files["core_identity.json"] || rt.mind?.identity),
      safeShape("realm_aida_architecture.json", files["realm_aida_architecture.json"] || rt.mind?.realm),
      safeShape("role_architect_companion.json", files["role_architect_companion.json"] || rt.mind?.role),
      safeShape(
        "project_briefcase_aida_architecture.json",
        files["project_briefcase_aida_architecture.json"] ||
          files["briefcase_aida_architecture.json"] ||
          files["project_aida_architecture.json"] ||
          rt.mind?.activeProject
      )
    ];

    log("SHAPES: Safe top-level key summary follows.", "log-blue");
    shapes.forEach((shape) => {
      if (!shape.present) {
        log(`SHAPE ${shape.name}: missing`, "log-amber");
        return;
      }

      log(`SHAPE ${shape.name}: keys=${shape.keys.join(", ") || "none"}`);
      const candidates = Object.entries(shape.nameCandidates)
        .map(([key, value]) => `${key}=${value}`)
        .join("; ");
      log(`SHAPE ${shape.name}: candidates=${candidates || "none"}`);
      const nested = Object.entries(shape.nestedCandidates || {})
        .map(([key, value]) => {
          const text = Object.entries(value).map(([innerKey, innerValue]) => `${innerKey}=${innerValue}`).join("; ");
          return `${key}{${text}}`;
        })
        .join(" | ");
      if (nested) log(`SHAPE ${shape.name}: nested=${nested}`);
    });

// AIDA REVIEW BLOCK 20: Browser export AIDA_SHAPE_SUMMARY - exposes this organ to the page runtime.
    window.AIDA_SHAPE_SUMMARY = shapes;
    return shapes;
  }

// AIDA REVIEW BLOCK 21: Function install - callable behavior in this runtime organ.
  function install() {
    const button = $("context-inspect-btn");
    if (button) button.addEventListener("click", inspectContext);
    const shapeButton = $("shape-inspect-btn");
    if (shapeButton) shapeButton.addEventListener("click", inspectShapes);
    const airlockButton = $("airlock-start-btn");
    if (airlockButton) {
      airlockButton.addEventListener("click", () => {
        if (window.AIDA_AIRLOCK?.inspectRoutes) {
          window.AIDA_AIRLOCK.inspectRoutes();
        }
      });
    }
    log("Context inspector loaded.", "log-blue");
  }

// AIDA REVIEW BLOCK 22: Browser export AIDA_CONTEXT_INSPECTOR - exposes this organ to the page runtime.
  window.AIDA_CONTEXT_INSPECTOR = {
    inspect: inspectContext,
    inspectShapes,
    buildSummary: buildContextSummary
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "context_inspection",
      reads: ["AIDA_RUNTIME.drive.files", "AIDA_RUNTIME.mind", "AIDA_RUNTIME.context"],
      writes: ["window.AIDA_CONTEXT_SUMMARY", "window.AIDA_SHAPE_SUMMARY"],
      requires: ["AIDA_RUNTIME"],
      verifies: ["pre-LLM context gate reports pass/wait without dumping private content"]
    });
  }

// AIDA REVIEW BLOCK 23: Browser event wiring - connects page lifecycle or user actions to this organ.
  document.addEventListener("DOMContentLoaded", install);
})();
