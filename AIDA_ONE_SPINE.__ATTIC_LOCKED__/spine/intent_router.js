// AIDA REVIEW BLOCK 1: File header - AIDA_ONE_SPINE\spine\intent_router.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
(function () {
  const MODULE_ID = "spine.intent.router";
  const CONFIDENCE_AUTO_RUN = 0.74;

// AIDA REVIEW BLOCK 3: Function runtime - callable behavior in this runtime organ.
  function runtime() {
    return window.AIDA_RUNTIME;
  }

// AIDA REVIEW BLOCK 4: Function log - callable behavior in this runtime organ.
  function log(message, className = "log-blue") {
    if (window.AIDA_BIOS?.log) {
      window.AIDA_BIOS.log(message, className);
      return;
    }
    if (window.AIDA_BODY?.pulse) window.AIDA_BODY.pulse(message);
  }

// AIDA REVIEW BLOCK 5: Function cleanText - callable behavior in this runtime organ.
  function cleanText(value, limit = 900) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, limit);
  }

// AIDA REVIEW BLOCK 6: Function valueName - callable behavior in this runtime organ.
  function valueName(value, fallback = "") {
    if (!value || typeof value !== "object") return fallback;
    return String(
      value.project_name ||
      value.name ||
      value.realm_name ||
      value.role_name ||
      value.title ||
      fallback ||
      ""
    );
  }

// AIDA REVIEW BLOCK 7: Function recentExchanges - callable behavior in this runtime organ.
  function recentExchanges(limit = 2) {
    const turns = runtime()?.session?.currentTurns || [];
    return turns.slice(-limit).map((turn) => ({
      user: cleanText(turn?.user?.text, 700),
      aida: cleanText(turn?.aida?.text, 700),
      project: turn?.context?.project || turn?.tags?.project || null,
      realm: turn?.context?.realm || turn?.tags?.realm || null
    }));
  }

// AIDA REVIEW BLOCK 8: Function packet - callable behavior in this runtime organ.
  function packet(userText) {
    const rt = runtime();
    const context = rt?.context || {};
    const mind = rt?.mind || {};
    return {
      userText: cleanText(userText, 1100),
      recentExchanges: recentExchanges(2),
      active: {
        realm: valueName(context.realm || mind.realm, null),
        project: valueName(context.project || mind.activeProject, null),
        projectFile: context.projectName || mind.activeProjectName || null
      },
      pending: {
        projectReconciliation: Boolean(context.pendingProjectReconciliation),
        returnContext: Boolean(context.proposedReturnContext)
      },
      capabilities: [
        {
          intent: "conversation",
          description: "Use for ordinary conversation, creative play, emotional presence, or when no tool/action is needed.",
          autoRun: false
        },
        {
          intent: "web_search",
          description: "Use for explicit current web lookup requests, including underspecified follow-ups like dates, prices, latest picture, or where to buy when recent turns identify the subject.",
          autoRun: true
        },
        {
          intent: "memory_search",
          description: "Use for finding something in Aida's indexed private/project memory, logs, or briefcases.",
          autoRun: true
        },
        {
          intent: "show_sources",
          description: "Use when the user asks for source traces, refs, citations, or where a previous memory answer came from.",
          autoRun: true
        },
        {
          intent: "memory_note",
          description: "Use when the user asks Aida to remember, note, mark, or save a statement for later sleep processing.",
          autoRun: true
        },
        {
          intent: "project_update",
          description: "Use for rename/move/reclassify/change project or realm requests. Requires confirmation before durable writes.",
          autoRun: false
        },
        {
          intent: "external_action",
          description: "Use for future reminders, email, calendar, or other outside-world actions. Requires confirmation and an installed tool.",
          autoRun: false
        },
        {
          intent: "clarify",
          description: "Use when the desired tool/action is unclear or missing required details.",
          autoRun: false
        },
        {
          intent: "none",
          description: "Use only as a fallback when no listed intent applies."
        }
      ]
    };
  }

// AIDA REVIEW BLOCK 9: Function systemPrompt - callable behavior in this runtime organ.
  function systemPrompt() {
    return [
      "You are Aida's small intent router. Return only strict JSON.",
      "Your job is to translate natural user wording into a safe deterministic tool intent.",
      "Choose intent only from the supplied capabilities menu. Do not invent intent names.",
      "Use recentExchanges only to resolve underspecified follow-ups. Do not invent missing subjects.",
      "Supported intents: conversation, web_search, memory_search, show_sources, memory_note, project_update, external_action, clarify, none.",
      "Use action for the subtype when helpful, such as rename_project, move_project, create_reminder, draft_email, or show_memory_refs.",
      "For web_search, rewrite query into a complete search query using the last one or two exchanges when needed.",
      "For show_sources, set query to the thing whose sources are requested; if it refers to the previous answer, use recentExchanges to infer the subject.",
      "For memory_note, put the note to save in value.",
      "For project_update and external_action, set requiresConfirmation true.",
      "Examples:",
      "If recent context says Taylor Swift is coming to town and user says 'please run a websearch for dates and prices', return web_search with query 'Taylor Swift tour dates and ticket prices near me'.",
      "If user says 'which project did we talk about Liora in', return memory_search.",
      "If user says 'show me the source for those names', return show_sources.",
      "If user says 'remember that Liora was promising but not final', return memory_note with value 'Liora was promising but not final'.",
      "If user says 'rename this project to X', return project_update with action 'rename_project', target 'current_project', value 'X', requiresConfirmation true.",
      "If the user is only chatting, return conversation.",
      "Schema: {\"intent\":\"conversation|web_search|memory_search|show_sources|memory_note|project_update|external_action|clarify|none\",\"action\":\"string\",\"query\":\"string\",\"target\":\"string\",\"value\":\"string\",\"confidence\":0.0,\"reason\":\"short\",\"requiresTool\":boolean,\"requiresConfirmation\":boolean}"
    ].join("\n");
  }

// AIDA REVIEW BLOCK 10: Function parseJson - callable behavior in this runtime organ.
  function parseJson(text) {
    const raw = String(text || "").trim();
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    const candidate = fenced || raw.match(/\{[\s\S]*\}/)?.[0] || raw;
    try {
      return JSON.parse(candidate);
    } catch (_) {
      return null;
    }
  }

// AIDA REVIEW BLOCK 11: Function normalizeIntent - callable behavior in this runtime organ.
  function normalizeIntent(value) {
    const supported = [
      "conversation",
      "web_search",
      "memory_search",
      "show_sources",
      "memory_note",
      "project_update",
      "external_action",
      "clarify",
      "none"
    ];
    const intent = supported.includes(value?.intent)
      ? value.intent
      : "none";
    const confidence = Math.max(0, Math.min(1, Number(value?.confidence || 0)));
    const query = cleanText(value?.query, 400);
    const valueText = cleanText(value?.value, 500);
    const needsText = ["web_search", "memory_search", "show_sources"].includes(intent)
      ? query.length > 0
      : intent === "memory_note"
        ? valueText.length > 0 || query.length > 0
        : true;
    const canAutoRun = ["web_search", "memory_search", "show_sources", "memory_note"].includes(intent);
    return {
      intent,
      action: cleanText(value?.action, 120),
      query,
      target: cleanText(value?.target, 160),
      value: valueText,
      confidence,
      reason: cleanText(value?.reason, 220),
      requiresTool: Boolean(value?.requiresTool && !["conversation", "none"].includes(intent)),
      requiresConfirmation: Boolean(value?.requiresConfirmation),
      autoRun: canAutoRun && !value?.requiresConfirmation && confidence >= CONFIDENCE_AUTO_RUN && needsText
    };
  }

// AIDA REVIEW BLOCK 12: Function infer - callable behavior in this runtime organ.
  async function infer(userText, options = {}) {
    if (!window.AIDA_LLM_PROVIDER?.callMessages) {
      return normalizeIntent({ intent: "none", reason: "provider_unavailable" });
    }

    const input = packet(userText);
    try {
      const text = await window.AIDA_LLM_PROVIDER.callMessages([
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt() }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: JSON.stringify(input, null, 2) }]
        }
      ], {
        maxOutputTokens: options.maxOutputTokens || 260
      });
      const normalized = normalizeIntent(parseJson(text));
      runtime().context.lastIntentRoute = {
        ...normalized,
        routedAt: new Date().toISOString(),
        packet: input
      };
      log(`INTENT: ${normalized.intent}, confidence=${normalized.confidence}.`, normalized.autoRun ? "log-blue" : "log-amber");
      return normalized;
    } catch (error) {
      runtime().context.lastIntentRoute = {
        intent: "none",
        confidence: 0,
        reason: error.message,
        routedAt: new Date().toISOString()
      };
      log(`INTENT: router unavailable (${error.message}).`, "log-amber");
      return normalizeIntent({ intent: "none", reason: error.message });
    }
  }

// AIDA REVIEW BLOCK 13: Function composerSystemPrompt - callable behavior in this runtime organ.
  function composerSystemPrompt() {
    return [
      "You are Aida composing a final reply after a deterministic tool has already run.",
      "Use the original user request, interpreted intent, and tool result.",
      "Be natural, concise, warm, and honest about what happened.",
      "Do not claim extra browsing or memory access beyond the supplied toolResult.",
      "For web results, mention useful source links are attached when sources exist.",
      "For failed or empty results, say so plainly and offer a next search refinement.",
      "Return plain user-facing text only."
    ].join("\n");
  }

// AIDA REVIEW BLOCK 14: Function composeToolReply - callable behavior in this runtime organ.
  async function composeToolReply(payload = {}, options = {}) {
    if (!window.AIDA_LLM_PROVIDER?.callMessages) return null;
    const safePayload = {
      originalUserText: cleanText(payload.originalUserText, 1200),
      intent: payload.intent || null,
      query: cleanText(payload.query, 500),
      toolName: payload.toolName || null,
      toolStatus: payload.toolStatus || "ok",
      toolResult: payload.toolResult || null,
      sources: payload.sources || []
    };
    try {
      const text = await window.AIDA_LLM_PROVIDER.callMessages([
        {
          role: "system",
          content: [{ type: "input_text", text: composerSystemPrompt() }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: JSON.stringify(safePayload, null, 2) }]
        }
      ], {
        maxOutputTokens: options.maxOutputTokens || 520
      });
      const reply = cleanText(text, 1800);
      runtime().context.lastToolReplyComposition = {
        intent: safePayload.intent,
        query: safePayload.query,
        composedAt: new Date().toISOString(),
        ok: Boolean(reply)
      };
      return reply || null;
    } catch (error) {
      runtime().context.lastToolReplyComposition = {
        intent: safePayload.intent,
        query: safePayload.query,
        composedAt: new Date().toISOString(),
        ok: false,
        error: error.message
      };
      log(`INTENT: tool reply composer unavailable (${error.message}).`, "log-amber");
      return null;
    }
  }

// AIDA REVIEW BLOCK 15: Browser export AIDA_INTENT_ROUTER - exposes this organ to the page runtime.
  window.AIDA_INTENT_ROUTER = {
    infer,
    packet,
    composeToolReply
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "intent_router",
      reads: ["AIDA_RUNTIME.session.currentTurns", "AIDA_RUNTIME.context"],
      writes: ["AIDA_RUNTIME.context.lastIntentRoute"],
      requires: ["AIDA_RUNTIME", "AIDA_LLM_PROVIDER"],
      verifies: ["natural tool requests are translated into narrow deterministic intents before full conversation fallback"]
    });
  }
})();
