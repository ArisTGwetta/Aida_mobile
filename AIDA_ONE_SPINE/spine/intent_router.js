(function () {
  const MODULE_ID = "spine.intent.router";
  const CONFIDENCE_AUTO_RUN = 0.74;

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function log(message, className = "log-blue") {
    if (window.AIDA_BIOS?.log) {
      window.AIDA_BIOS.log(message, className);
      return;
    }
    if (window.AIDA_BODY?.pulse) window.AIDA_BODY.pulse(message);
  }

  function cleanText(value, limit = 900) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, limit);
  }

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

  function recentExchanges(limit = 2) {
    const turns = runtime()?.session?.currentTurns || [];
    return turns.slice(-limit).map((turn) => ({
      user: cleanText(turn?.user?.text, 700),
      aida: cleanText(turn?.aida?.text, 700),
      project: turn?.context?.project || turn?.tags?.project || null,
      realm: turn?.context?.realm || turn?.tags?.realm || null
    }));
  }

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
          intent: "none",
          description: "Use for normal conversation or when a tool request is ambiguous."
        }
      ]
    };
  }

  function systemPrompt() {
    return [
      "You are Aida's small intent router. Return only strict JSON.",
      "Your job is to translate natural user wording into a safe deterministic tool intent.",
      "Use recentExchanges only to resolve underspecified follow-ups. Do not invent missing subjects.",
      "Supported intents: web_search, memory_search, none.",
      "For web_search, rewrite query into a complete search query using the last one or two exchanges when needed.",
      "Examples:",
      "If recent context says Taylor Swift is coming to town and user says 'please run a websearch for dates and prices', return web_search with query 'Taylor Swift tour dates and ticket prices near me'.",
      "If user says 'which project did we talk about Liora in', return memory_search.",
      "If the user is only chatting, return none.",
      "Schema: {\"intent\":\"web_search|memory_search|none\",\"query\":\"string\",\"confidence\":0.0,\"reason\":\"short\",\"requiresTool\":boolean}"
    ].join("\n");
  }

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

  function normalizeIntent(value) {
    const intent = ["web_search", "memory_search", "none"].includes(value?.intent)
      ? value.intent
      : "none";
    const confidence = Math.max(0, Math.min(1, Number(value?.confidence || 0)));
    const query = cleanText(value?.query, 400);
    return {
      intent,
      query,
      confidence,
      reason: cleanText(value?.reason, 220),
      requiresTool: Boolean(value?.requiresTool && intent !== "none"),
      autoRun: intent !== "none" && confidence >= CONFIDENCE_AUTO_RUN && query.length > 0
    };
  }

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
