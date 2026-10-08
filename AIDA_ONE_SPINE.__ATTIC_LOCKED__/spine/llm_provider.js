// AIDA REVIEW BLOCK 1: File header - AIDA_ONE_SPINE\spine\llm_provider.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
(function () {
  const MODULE_ID = "spine.llm.provider";
  const FIXED_ENDPOINTS = {
    openai: "https://api.openai.com/v1/responses",
    xai: "https://api.x.ai/v1/responses"
  };

// AIDA REVIEW BLOCK 3: Function runtime - callable behavior in this runtime organ.
  function runtime() {
    return window.AIDA_RUNTIME;
  }

// AIDA REVIEW BLOCK 4: Function config - callable behavior in this runtime organ.
  function config() {
    return window.AIDA_CONFIG?.llm || {};
  }

// AIDA REVIEW BLOCK 5: Function normalizeProvider - callable behavior in this runtime organ.
  function normalizeProvider(value) {
    const provider = String(value || "openai").trim().toLowerCase();
    if (provider === "grok") return "xai";
    if (provider === "local" || provider === "ollama-local") return "ollama";
    return provider;
  }

// AIDA REVIEW BLOCK 6: Function route - callable behavior in this runtime organ.
  function route() {
    return runtime()?.tokens?.llm || {};
  }

// AIDA REVIEW BLOCK 7: Function providerDefaults - callable behavior in this runtime organ.
  function providerDefaults(provider) {
    return config().providers?.[provider] || {};
  }

// AIDA REVIEW BLOCK 8: Function requiresKey - callable behavior in this runtime organ.
  function requiresKey(provider = normalizeProvider(route().provider)) {
    return provider !== "ollama" && route().auth !== "none";
  }

// AIDA REVIEW BLOCK 9: Function endpointFor - callable behavior in this runtime organ.
  function endpointFor(provider) {
    if (FIXED_ENDPOINTS[provider]) return FIXED_ENDPOINTS[provider];
    if (provider !== "ollama") throw new Error(`Unsupported LLM provider: ${provider}.`);

    const endpoint = route().endpoint || providerDefaults(provider).endpoint || "http://127.0.0.1:11434/v1/responses";
    let parsed;
    try {
      parsed = new URL(endpoint);
    } catch (_) {
      throw new Error("Ollama endpoint is not a valid URL.");
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Ollama endpoint must use HTTP or HTTPS.");
    }
    return parsed.toString();
  }

// AIDA REVIEW BLOCK 10: Function assertBrowserCanReach - callable behavior in this runtime organ.
  function assertBrowserCanReach(provider, endpoint) {
    if (provider !== "ollama" || typeof window === "undefined") return;

    let target;
    try {
      target = new URL(endpoint);
    } catch (_) {
      return;
    }

    const loopback = ["127.0.0.1", "localhost", "::1"].includes(target.hostname);
    const hostedHttps = window.location?.protocol === "https:";
    if (loopback && target.protocol === "http:" && hostedHttps) {
      throw new Error(
        "Local Ollama cannot be reached from the hosted GitHub page. Open Aida through the local Preview Awake address (http://127.0.0.1:8765/) and select route 789 there."
      );
    }
  }

// AIDA REVIEW BLOCK 11: Function modelFor - callable behavior in this runtime organ.
  function modelFor(provider, override) {
    return (
      override ||
      route().model ||
      providerDefaults(provider).model ||
      (provider === "xai" ? "grok-4.3" : provider === "ollama" ? "llama3:latest" : config().model) ||
      "gpt-4.1-mini"
    );
  }

// AIDA REVIEW BLOCK 12: Function currentInfo - callable behavior in this runtime organ.
  function currentInfo() {
    if (!route().provider) return null;
    const provider = normalizeProvider(route().provider);
    const model = modelFor(provider);
    const labels = {
      openai: "OpenAI",
      xai: "xAI (Grok)",
      ollama: "local Ollama"
    };
    return {
      provider,
      providerLabel: labels[provider] || provider,
      model,
      profile: route().profile || "default",
      local: provider === "ollama"
    };
  }

// AIDA REVIEW BLOCK 13: Function extractOutputText - callable behavior in this runtime organ.
  function extractOutputText(data) {
    if (typeof data?.output_text === "string" && data.output_text.trim()) {
      return data.output_text.trim();
    }

    const chunks = [];
    for (const item of data?.output || []) {
      for (const content of item.content || []) {
        if (typeof content.text === "string") chunks.push(content.text);
      }
    }
    return chunks.join("\n").trim();
  }

// AIDA REVIEW BLOCK 14: Function extractWebSources - callable behavior in this runtime organ.
  function extractWebSources(data) {
    const sources = [];
    for (const item of data?.output || []) {
      if (item?.type === "web_search_call") {
        for (const source of item?.action?.sources || []) {
          if (source?.url) sources.push({ url: source.url, title: source.title || source.url });
        }
      }
      for (const content of item?.content || []) {
        for (const annotation of content?.annotations || []) {
          if (annotation?.type === "url_citation" && annotation?.url) {
            sources.push({ url: annotation.url, title: annotation.title || annotation.url });
          }
        }
      }
    }
    const seen = new Set();
    return sources.filter((source) => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    });
  }

// AIDA REVIEW BLOCK 15: Function readiness - callable behavior in this runtime organ.
  function readiness() {
    const selected = normalizeProvider(route().provider);
    const missing = [];
    if (!["openai", "xai", "ollama"].includes(selected)) missing.push("supported LLM provider");
    if (requiresKey(selected) && !route().key) missing.push(`${selected} API key`);
    return {
      pass: missing.length === 0,
      provider: selected,
      missing
    };
  }

// AIDA REVIEW BLOCK 16: Function callMessages - callable behavior in this runtime organ.
  async function callMessages(messages, options = {}) {
    const ready = readiness();
    if (!ready.pass) throw new Error(`LLM route is not ready: ${ready.missing.join(", ")}.`);

    const provider = ready.provider;
    const model = modelFor(provider, options.model);
    const maxOutputTokens = options.maxOutputTokens || config().maxOutputTokens || 700;
    const extraBody = options.body && typeof options.body === "object" ? options.body : {};
    const headers = { "Content-Type": "application/json" };
    if (requiresKey(provider)) headers.Authorization = `Bearer ${route().key}`;

    const endpoint = endpointFor(provider);
    assertBrowserCanReach(provider, endpoint);
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        input: messages,
        max_output_tokens: maxOutputTokens,
        ...extraBody
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = data?.error?.message || data?.detail || `HTTP ${response.status}`;
      throw new Error(`${provider} request failed: ${detail}`);
    }

    const text = extractOutputText(data);
    if (!text) throw new Error(`${provider} response did not contain text output.`);

    const rt = runtime();
    if (rt?.context) {
      rt.context.lastLlmResponse = {
        provider,
        model,
        responseId: data.id || null,
        createdAt: new Date().toISOString()
      };
    }
    return text;
  }

// AIDA REVIEW BLOCK 17: Function callWebSearch - callable behavior in this runtime organ.
  async function callWebSearch(query, options = {}) {
    const ready = readiness();
    if (!ready.pass) throw new Error(`LLM route is not ready: ${ready.missing.join(", ")}.`);
    if (ready.provider !== "openai") {
      throw new Error("Web retrieval currently requires the OpenAI route.");
    }
    const model = options.model || config().webSearchModel || "gpt-5.5";
    const response = await fetch(FIXED_ENDPOINTS.openai, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${route().key}`
      },
      body: JSON.stringify({
        model,
        tools: [{ type: "web_search" }],
        tool_choice: "auto",
        include: ["web_search_call.action.sources"],
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "You are Aida's explicit web retriever. Research only the user's stated query. Give a concise answer grounded in current web sources. Distinguish established facts from uncertainty. Do not claim background research, and do not mix private memory into the search request."
              }
            ]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: String(query || "").trim() }]
          }
        ],
        max_output_tokens: options.maxOutputTokens || 1100
      })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = data?.error?.message || data?.detail || `HTTP ${response.status}`;
      throw new Error(`OpenAI web search failed: ${detail}`);
    }
    const text = extractOutputText(data);
    if (!text) throw new Error("OpenAI web search did not contain text output.");
    const result = {
      text,
      sources: extractWebSources(data),
      provider: "openai",
      model,
      responseId: data.id || null,
      searchedAt: new Date().toISOString()
    };
    const rt = runtime();
    rt.research = rt.research || {};
    rt.research.lastWebSearch = result;
    rt.research.history = [...(rt.research.history || []), result].slice(-10);
    return result;
  }

// AIDA REVIEW BLOCK 18: Browser export AIDA_LLM_PROVIDER - exposes this organ to the page runtime.
  window.AIDA_LLM_PROVIDER = {
    callMessages,
    callWebSearch,
    extractOutputText,
    extractWebSources,
    readiness,
    currentInfo,
    normalizeProvider,
    requiresKey
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "conversation_loop",
      reads: ["AIDA_RUNTIME.tokens.llm", "AIDA_CONFIG.llm.providers"],
      writes: ["AIDA_RUNTIME.context.lastLlmResponse"],
      requires: ["AIDA_RUNTIME"],
      verifies: ["OpenAI and xAI use fixed official endpoints; Ollama routes send no bearer key; explicit OpenAI web retrieval returns source metadata"]
    });
  }
})();
