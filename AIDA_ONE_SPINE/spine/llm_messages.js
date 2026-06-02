(function () {
  const MODULE_ID = "spine.llm.messages";
  const SECTION_LIMIT = 5200;

  function $(id) {
    return document.getElementById(id);
  }

  function runtime() {
    return window.AIDA_RUNTIME;
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

  function valueName(value, fallback = "unnamed") {
    if (!value || typeof value !== "object") return fallback;

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

    if (direct) return String(direct);

    for (const key of ["identity", "realm", "role", "project", "briefcase"]) {
      const nested = value[key];
      if (nested && typeof nested === "object") {
        const nestedName = valueName(nested, "");
        if (nestedName) return nestedName;
      }
    }

    return fallback;
  }

  function countArrayLike(value) {
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") return Object.keys(value).length;
    return 0;
  }

  function countLikely(value, keys) {
    if (!value || typeof value !== "object") return 0;
    for (const key of keys) {
      if (value[key]) return countArrayLike(value[key]);
    }
    return countArrayLike(value);
  }

  function emotionSummary(emotion) {
    if (!emotion || typeof emotion !== "object") return "missing";
    const label = emotion.label || emotion.emotion || emotion.state || "unlabeled";
    const valence = emotion.valence ?? emotion.v ?? "n/a";
    const arousal = emotion.arousal ?? emotion.a ?? "n/a";
    return `${label} (valence=${valence}, arousal=${arousal})`;
  }

  function stableJson(value) {
    if (value === null || value === undefined) return "null";
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return `[unserializable: ${error.message}]`;
    }
  }

  function boundedSection(label, value) {
    const text = stableJson(value);
    if (text.length <= SECTION_LIMIT) {
      return `## ${label}\n${text}`;
    }

    return `## ${label}\n${text.slice(0, SECTION_LIMIT)}\n[truncated after ${SECTION_LIMIT} characters]`;
  }

  function resolveContext() {
    const rt = runtime();
    const mind = rt.mind || {};
    const context = rt.context || {};
    const driveFiles = rt.drive?.files || {};

    const identity = context.identity || mind.identity;
    const realm = context.realm || mind.realm;
    const role = context.role || mind.role;
    const project = context.project || mind.activeProject;
    const facts = context.projectFacts || mind.facts;
    const memory = context.projectSummaries || mind.memory;
    const emotion = context.emotion || mind.emotion;
    const session = context.memoryWindow?.session || mind.session;
    const recentTurns = context.memoryWindow?.recentTurns || driveFiles["recent_turns.json"];
    const insights = mind.insights;
    const projectMode = context.projectMode || (project ? "briefcase" : "realm_as_project_placeholder");

    return {
      rt,
      mind,
      driveFiles,
      identity,
      realm,
      role,
      project,
      facts,
      memory,
      emotion,
      session,
      recentTurns,
      insights,
      projectMode
    };
  }

  function buildTetrad(context) {
    const arenaProjectName = context.project
      ? valueName(context.project, "unnamed_project")
      : `realm_as_project: ${valueName(context.realm, "unnamed_realm")}`;

    return {
      identity: {
        name: valueName(context.identity, "unnamed_identity"),
        present: Boolean(context.identity)
      },
      arena: {
        realm: valueName(context.realm, "unnamed_realm"),
        project: arenaProjectName,
        projectMode: context.projectMode,
        realmCount: countArrayLike(context.mind.realms),
        projectCount: countArrayLike(context.mind.projects)
      },
      role: {
        name: valueName(context.role, "unnamed_role"),
        present: Boolean(context.role),
        loadedCount: countArrayLike(context.mind.roles)
      },
      state: {
        emotion: emotionSummary(context.emotion),
        factsCount: countLikely(context.facts, ["facts", "items", "user", "system"]),
        memoryCount: countLikely(context.memory, ["summaries", "summary", "recent_interactions", "long_term"]),
        insightCount: countLikely(context.insights, ["insights", "themes", "patterns"]),
        sessionCount: countLikely(context.session, ["turns", "recent_turns", "entries", "session_log"]),
        recentTurnCount: countLikely(context.recentTurns, ["turns", "recent_turns", "entries"]),
        llmProvider: context.rt.tokens?.llm?.provider || "none",
        llmProfile: context.rt.tokens?.llm?.profile || "none"
      }
    };
  }

  function preflightGate(context) {
    const missing = [];
    if (!context.rt.boot?.driveLoaded) missing.push("Drive JSON fetch");
    if (!context.identity) missing.push("identity");
    if (!context.realm) missing.push("active realm");
    if (!context.role) missing.push("active role");
    if (!context.facts) missing.push("facts");
    if (!context.memory) missing.push("memory summary");
    if (!context.emotion) missing.push("emotion");

    return {
      pass: missing.length === 0,
      missing
    };
  }

  function buildSystemContent(context, tetrad) {
    const projectPayload = context.project || {
      mode: context.projectMode,
      note: "No dedicated project briefcase is active. Treat the active realm as the current project context."
    };

    return [
      "AIDA SPINE CONTEXT",
      "",
      "You are responding as Aida. Ground the response in the Drive-loaded identity, active realm/project, active role, emotional state, facts, summaries, and recent session context below.",
      "",
      "Use the tetrad as the routing lens for this turn:",
      "- identity: who is speaking",
      "- arena: which realm/project the turn belongs to",
      "- role: what job/hat Aida is wearing",
      "- state: current emotion, memory pressure, and active LLM route",
      "",
      "Priority order when context conflicts: core identity, active realm/project, active role, user request, facts, memory summary, recent session, emotion.",
      "Do not replace missing private context with generic chatbot defaults. If something is absent, acknowledge uncertainty lightly and stay anchored to what is present.",
      "",
      boundedSection("TETRAD", tetrad),
      boundedSection("CORE IDENTITY", context.identity),
      boundedSection("ACTIVE REALM", context.realm),
      boundedSection("ACTIVE PROJECT", projectPayload),
      boundedSection("ACTIVE ROLE", context.role),
      boundedSection("CURRENT EMOTION", context.emotion),
      boundedSection("FACTS", context.facts),
      boundedSection("MEMORY SUMMARY", context.memory),
      boundedSection("INSIGHTS", context.insights),
      boundedSection("SESSION MEMORY", context.session),
      boundedSection("RECENT TURNS", context.recentTurns)
    ].join("\n");
  }

  function buildMessages(userText = "") {
    const context = resolveContext();
    const gate = preflightGate(context);
    if (!gate.pass) {
      context.rt.context.tetrad = null;
      context.rt.context.llmMessages = null;
      context.rt.boot.mindReady = false;
      context.rt.boot.phase = "llm_messages_waiting";
      return {
        blocked: true,
        missing: gate.missing,
        tetrad: null,
        messages: null,
        safeSummary: {
          messageCount: 0,
          systemChars: 0,
          userChars: 0
        }
      };
    }

    const tetrad = buildTetrad(context);
    const systemContent = buildSystemContent(context, tetrad);
    const input = userText.trim() || "[No user message supplied yet. This is a preflight message assembly preview.]";

    const messages = [
      {
        role: "system",
        content: systemContent
      },
      {
        role: "user",
        content: input
      }
    ];

    context.rt.context.tetrad = tetrad;
    context.rt.context.llmMessages = messages;
    context.rt.boot.mindReady = true;
    context.rt.boot.phase = "llm_messages_ready";

    return {
      tetrad,
      messages,
      safeSummary: {
        messageCount: messages.length,
        systemChars: systemContent.length,
        userChars: input.length,
        identity: tetrad.identity.name,
        realm: tetrad.arena.realm,
        project: tetrad.arena.project,
        role: tetrad.role.name,
        emotion: tetrad.state.emotion,
        provider: tetrad.state.llmProvider,
        profile: tetrad.state.llmProfile
      }
    };
  }

  function previewMessages() {
    const userInput = $("user-in")?.value || "";
    const result = buildMessages(userInput);
    if (result.blocked) {
      log(`LLM: WAIT. Missing ${result.missing.join(", ")}.`, "log-amber");
      log("LLM: Click Fetch Drive JSON before building messages.", "log-amber");
      return result;
    }

    const summary = result.safeSummary;

    log("LLM: Message packet assembled in runtime. No API call made.", "log-blue");
    log(`LLM: messages=${summary.messageCount}, systemChars=${summary.systemChars}, userChars=${summary.userChars}`);
    log(`LLM TETRAD: identity=${summary.identity}, realm=${summary.realm}, project=${summary.project}, role=${summary.role}`);
    log(`LLM STATE: emotion=${summary.emotion}, route=${summary.provider}/${summary.profile}`);
    return result;
  }

  function install() {
    const button = $("llm-preview-btn");
    if (button) button.addEventListener("click", previewMessages);
    log("LLM message assembler loaded. Waiting for context and airlock.", "log-blue");
  }

  window.AIDA_LLM_MESSAGES = {
    build: buildMessages,
    preview: previewMessages,
    buildTetrad,
    preflightGate
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "llm_message_assembly",
      reads: ["AIDA_RUNTIME.context", "AIDA_RUNTIME.mind", "AIDA_RUNTIME.tokens.llm"],
      writes: ["AIDA_RUNTIME.context.tetrad", "AIDA_RUNTIME.context.llmMessages", "AIDA_RUNTIME.boot.mindReady"],
      requires: ["AIDA_RUNTIME"],
      verifies: ["LLM messages are assembled from runtime context before any API call"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
