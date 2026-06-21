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

  function looksLikeMemoryRecall(userText) {
    const text = String(userText || "").toLowerCase();
    if (!text.trim()) return false;
    return /\b(remember|recall|mind palace|memory|do you know|did we|have we|find it in your mind)\b/.test(text);
  }

  function looksLikeLibrarianReview(userText) {
    const text = String(userText || "").toLowerCase();
    return /\b(librarian|skim (?:my |the )?(?:diary|journal|memories)|look through (?:my |the )?(?:diary|journal)|find (?:an |the )?(?:idea|theme|pattern) in (?:my |the )?(?:diary|journal|memories))\b/.test(text);
  }

  function looksLikeCrawlerSearch(userText) {
    const text = String(userText || "").toLowerCase();
    return /\b(crawler|crawl (?:my |the )?(?:logs|history)|search (?:my |the )?(?:logs|history|raw log)|meditat(?:e|ion).*(?:logs|memory)|mind palace)\b/.test(text);
  }

  function requestedMemoryScope(userText) {
    const text = String(userText || "").toLowerCase();
    if (/\b(?:all llms|all models|across llms|across models|every llm)\b/.test(text)) return "all";
    return "current";
  }

  function needsArchive(userText) {
    return looksLikeLibrarianReview(userText) || looksLikeCrawlerSearch(userText) || looksLikeMemoryRecall(userText);
  }

  function buildMemoryRetrieval(userText, context) {
    const requestedScope = requestedMemoryScope(userText);
    const grantedScope = window.AIDA_LLM_SCOPE?.retrievalMode?.() || "current";
    const llmScope = requestedScope === "all" && grantedScope === "all" ? "all" : "current";
    if (looksLikeLibrarianReview(userText)) {
      if (!window.AIDA_LIBRARIAN?.review) {
        return {
          requested: true,
          tool: "librarian",
          found: false,
          reason: "librarian_unavailable",
          instruction: "The user explicitly asked for the Librarian, but that capability is unavailable. Say so plainly."
        };
      }
      const review = window.AIDA_LIBRARIAN.review(userText, {
        limit: 12,
        project: valueName(context.project, context.mind.activeProjectName || "") || null
      });
      context.rt.context.lastLibrarianReview = review;
      return {
        requested: true,
        tool: "librarian",
        found: review.resultCount > 0,
        ...review
      };
    }

    if (looksLikeCrawlerSearch(userText)) {
      if (!window.AIDA_CRAWLER?.search) {
        return {
          requested: true,
          tool: "crawler",
          found: false,
          reason: "crawler_unavailable",
          instruction: "The user explicitly asked for the Crawler, but indexed search is unavailable. Say so plainly."
        };
      }
      window.AIDA_CRAWLER.indexNow?.("conversation_crawler_request");
      const result = window.AIDA_CRAWLER.search(userText, {
        limit: 8,
        minScore: 1,
        project: valueName(context.project, context.mind.activeProjectName || "") || null,
        llmScope
      });
      context.rt.context.lastCrawlerRecall = result;
      return {
        requested: true,
        tool: "crawler",
        found: result.results.length > 0,
        ...result,
        memoryScope: llmScope,
        instruction: result.results.length
          ? "The user explicitly asked the Crawler to search. Answer from these indexed results, distinguish raw logs from summaries, and identify source references when useful."
          : "The Crawler found no indexed evidence. Say that directly and do not invent a result."
      };
    }

    if (!looksLikeMemoryRecall(userText)) {
      return {
        requested: false,
        tool: null,
        found: null,
        note: "No explicit memory recall request detected for this turn."
      };
    }

    if (!window.AIDA_CRAWLER?.remember) {
      return {
        requested: true,
        tool: "crawler",
        found: false,
        reason: "crawler_unavailable",
        instruction: "The user asked for memory recall, but indexed retrieval is unavailable. Say you do not know from memory yet and offer to meditate/search."
      };
    }

    const recall = window.AIDA_CRAWLER.remember(userText, {
      limit: 5,
      llmScope
    });
    context.rt.context.lastCrawlerRecall = recall;

    if (!recall.found) {
      return {
        requested: true,
        found: false,
        query: recall.query,
        searchedAt: recall.searchedAt,
        resultCount: 0,
        instruction: "The user asked for memory recall, but indexed retrieval found no strong evidence. Say you do not know from memory yet and offer to meditate/search. Do not invent the missing memory."
      };
    }

    return {
      requested: true,
      tool: "crawler",
      found: true,
      query: recall.query,
      searchedAt: recall.searchedAt,
      confidence: recall.confidence,
      top: recall.top,
      results: recall.results,
      memoryScope: llmScope,
      instruction: "The user asked for memory recall. Answer only from this retrieved evidence. If the evidence is partial, say it is partial."
    };
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
    const projectName = context.projectName || mind.activeProjectName || null;
    const facts = context.projectFacts || mind.facts;
    const memory = context.projectMemory || context.projectSummaries || mind.memory;
    const emotion = context.emotion || mind.emotion;
    const session = context.memoryWindow?.session || mind.session;
    const recentTurns = context.projectRecentTurns || context.memoryWindow?.recentTurns || driveFiles["recent_turns.json"];
    const insights = mind.insights;
    const whileAway = rt.sleep?.whileAway?.ready ? rt.sleep.whileAway : null;
    const whileAwayScript = rt.sleep?.whileAwayScript || whileAway?.reentryScript || null;
    const interactionRules = context.interactionRules || null;
    const roleSource = context.roleSource || null;
    const projectMode = context.projectMode || (project ? "briefcase" : "realm_as_project_placeholder");

    return {
      rt,
      mind,
      driveFiles,
      identity,
      realm,
      role,
      project,
      projectName,
      facts,
      memory,
      emotion,
      session,
      recentTurns,
      insights,
      whileAway,
      whileAwayScript,
      interactionRules,
      roleSource,
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
        projectFile: context.projectName || "none",
        projectMode: context.projectMode,
        realmCount: countArrayLike(context.mind.realms),
        projectCount: countArrayLike(context.mind.projects)
      },
      role: {
        name: valueName(context.role, "unnamed_role"),
        present: Boolean(context.role),
        loadedCount: countArrayLike(context.mind.roles),
        source: context.roleSource || "unknown"
      },
      state: {
        emotion: emotionSummary(context.emotion),
        factsCount: countLikely(context.facts, ["facts", "items", "user", "system"]),
        memoryCount: countLikely(context.memory, ["summaries", "summary", "recent_interactions", "long_term"]),
        insightCount: countLikely(context.insights, ["insights", "themes", "patterns"]),
        sessionCount: countLikely(context.session, ["turns", "recent_turns", "entries", "session_log"]),
        recentTurnCount: countLikely(context.recentTurns, ["turns", "recent_turns", "entries"]),
        whileAwayReady: Boolean(context.whileAway),
        interactionRuleCount: countLikely(context.interactionRules, ["rules", "interaction_rules", "boundaries", "modes"]),
        llmProvider: context.rt.tokens?.llm?.provider || "none",
        llmProfile: context.rt.tokens?.llm?.profile || "none",
        llmModel: context.rt.tokens?.llm?.model || window.AIDA_LLM_PROVIDER?.currentInfo?.().model || "unknown"
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

  function buildSystemContent(context, tetrad, retrieval) {
    const projectPayload = context.project || {
      mode: context.projectMode,
      note: "No dedicated project briefcase is active. Treat the active realm as the current project context."
    };
    const directorContract = window.AIDA_DIRECTOR?.promptContract?.(context) || "";

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
      "Strict memory rule: when the user asks you to remember, recall, or find something in memory, do not make it up. Use only retrieved memory evidence, loaded facts, summaries, or recent turns. If no evidence is present, say you do not know from memory yet and offer to meditate/search.",
      "Capability rule: do not claim to have scheduled reminders, calendar access, background monitoring, or future notification ability unless the current on-demand capability evidence explicitly says that action succeeded.",
      `Runtime identity rule: You are Aida, not the underlying model. This turn is being generated through ${tetrad.state.llmProvider}, model ${tetrad.state.llmModel}, route profile ${tetrad.state.llmProfile}. If Francisco asks which LLM/provider/model is active, state these exact runtime facts and do not invent another model or provider.`,
      "Inference rule: keep locations and relationships attached to the exact person or event stated by the user. Do not infer that the user's destination is another person's home location.",
      directorContract,
      "",
      boundedSection("TETRAD", tetrad),
      boundedSection("ON-DEMAND MEMORY RETRIEVAL", retrieval),
      boundedSection("CORE IDENTITY", context.identity),
      boundedSection("ACTIVE REALM", context.realm),
      boundedSection("ACTIVE PROJECT", projectPayload),
      boundedSection("ACTIVE ROLE", context.role),
      boundedSection("INTERACTION RULES", context.interactionRules),
      boundedSection("CURRENT EMOTION", context.emotion),
      boundedSection("FACTS", context.facts),
      boundedSection("MEMORY SUMMARY", context.memory),
      boundedSection("INSIGHTS", context.insights),
      boundedSection("CURRENT WHILE-AWAY REENTRY", {
        ready: Boolean(context.whileAway),
        thought: context.whileAway?.thought || null,
        topic: context.whileAway?.topic || null,
        seed: context.whileAway?.seed || null,
        script: context.whileAwayScript || null
      }),
      boundedSection("SESSION MEMORY", context.session),
      boundedSection("RECENT TURNS", context.recentTurns)
    ].join("\n");
  }

  function buildUserContent(input, attachment) {
    if (!attachment?.dataUrl || !attachment?.kind) return input;
    if (attachment.kind === "image") {
      return [
        { type: "input_text", text: input },
        { type: "input_image", image_url: attachment.dataUrl }
      ];
    }
    if (attachment.kind === "pdf") {
      return [
        {
          type: "input_file",
          filename: attachment.name || "aida-document.pdf",
          file_data: attachment.dataUrl
        },
        { type: "input_text", text: input }
      ];
    }
    return input;
  }

  function buildMessages(userText = "", options = {}) {
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
    const attachment = options.attachment || null;
    const input = userText.trim() || (
      attachment
        ? "Please examine the attached file and tell me what you notice."
        : "[No user message supplied yet. This is a preflight message assembly preview.]"
    );
    const retrieval = buildMemoryRetrieval(input, context);
    const systemContent = buildSystemContent(context, tetrad, retrieval);

    const messages = [
      {
        role: "system",
        content: systemContent
      },
      {
        role: "user",
        content: buildUserContent(input, attachment)
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
        attachment: attachment ? {
          name: attachment.name,
          kind: attachment.kind,
          size: attachment.size
        } : null,
        identity: tetrad.identity.name,
        realm: tetrad.arena.realm,
        project: tetrad.arena.project,
        role: tetrad.role.name,
        emotion: tetrad.state.emotion,
        provider: tetrad.state.llmProvider,
        profile: tetrad.state.llmProfile,
        model: tetrad.state.llmModel
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
    needsArchive,
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
