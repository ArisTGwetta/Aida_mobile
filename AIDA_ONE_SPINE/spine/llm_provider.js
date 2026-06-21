(function () {
  const MODULE_ID = "spine.llm.provider";
  const FIXED_ENDPOINTS = {
    openai: "https://api.openai.com/v1/responses",
    xai: "https://api.x.ai/v1/responses"
  };

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function config() {
    return window.AIDA_CONFIG?.llm || {};
  }

  function normalizeProvider(value) {
    const provider = String(value || "openai").trim().toLowerCase();
    if (provider === "grok") return "xai";
    if (provider === "local" || provider === "ollama-local") return "ollama";
    return provider;
  }

  function route() {
    return runtime()?.tokens?.llm || {};
  }

  function providerDefaults(provider) {
    return config().providers?.[provider] || {};
  }

  function requiresKey(provider = normalizeProvider(route().provider)) {
    return provider !== "ollama" && route().auth !== "none";
  }

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

  function modelFor(provider, override) {
    return (
      override ||
      route().model ||
      providerDefaults(provider).model ||
      (provider === "xai" ? "grok-4.3" : provider === "ollama" ? "llama3:latest" : config().model) ||
      "gpt-4.1-mini"
    );
  }

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

  window.AIDA_LLM_PROVIDER = {
    callMessages,
    extractOutputText,
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
      verifies: ["OpenAI and xAI use fixed official endpoints; Ollama routes send no bearer key"]
    });
  }
})();
