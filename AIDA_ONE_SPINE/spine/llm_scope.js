(function () {
  const MODULE_ID = "spine.llm.scope";

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function normalize(value) {
    return window.AIDA_LLM_PROVIDER?.normalizeProvider?.(value) || String(value || "").toLowerCase();
  }

  function current() {
    const route = runtime()?.tokens?.llm || {};
    const provider = route.provider ? normalize(route.provider) : null;
    return {
      provider,
      profile: route.profile || null,
      model: route.model || window.AIDA_LLM_PROVIDER?.currentInfo?.()?.model || null,
      scope: provider || "shared",
      private: provider === "ollama" || route.profile === "private-local"
    };
  }

  function ensureAccess() {
    const rt = runtime();
    rt.context = rt.context || {};
    rt.context.llmMemoryAccess = rt.context.llmMemoryAccess || {
      mode: "current",
      oneUse: false,
      reason: null,
      grantedAt: null
    };
    return rt.context.llmMemoryAccess;
  }

  function authorizeOnce(mode = "current", reason = "explicit_user_request") {
    const access = ensureAccess();
    access.mode = mode === "all" ? "all" : "current";
    access.oneUse = access.mode === "all";
    access.reason = reason;
    access.grantedAt = new Date().toISOString();
    return { ...access };
  }

  function retrievalMode() {
    return ensureAccess().mode === "all" ? "all" : "current";
  }

  function consumeAccess() {
    const access = ensureAccess();
    const used = { ...access };
    if (access.oneUse) {
      access.mode = "current";
      access.oneUse = false;
      access.reason = null;
      access.grantedAt = null;
    }
    return used;
  }

  function clearAccess() {
    const access = ensureAccess();
    access.mode = "current";
    access.oneUse = false;
    access.reason = null;
    access.grantedAt = null;
    return { ...access };
  }

  function from(value, fallback = "shared") {
    const provider = normalize(
      value?.llm_provider ||
      value?.llmProvider ||
      value?.llm?.provider ||
      value?.route?.provider ||
      value?.tags?.llm_provider ||
      ""
    );
    return {
      provider: provider || (fallback === "shared" ? null : normalize(fallback)),
      profile: value?.llm_profile || value?.llmProfile || value?.llm?.profile || value?.route?.profile || value?.tags?.llm_profile || null,
      model: value?.llm_model || value?.llmModel || value?.llm?.model || value?.tags?.llm_model || null,
      scope: provider || fallback
    };
  }

  function tag(target, source = current()) {
    if (!target || typeof target !== "object") return target;
    target.llm_provider = source.provider || null;
    target.llm_profile = source.profile || null;
    target.llm_model = source.model || null;
    target.llm_scope = source.scope || source.provider || "shared";
    return target;
  }

  function allows(value, options = {}) {
    if (options.scope === "all") return true;
    const active = options.provider ? normalize(options.provider) : current().provider;
    if (!active) return true;
    const entryScope = from(value, options.fallback || "shared");
    return entryScope.scope === "shared" || entryScope.provider === active;
  }

  function label(info = current()) {
    if (info.provider === "xai") return "GROK · HOSTED";
    if (info.provider === "ollama") return "OLLAMA · LOCAL";
    if (info.provider === "openai") return "OPENAI · HOSTED";
    return "LLM · UNSELECTED";
  }

  function applyVisuals() {
    const info = current();
    const root = document.documentElement;
    if (root) root.dataset.llmProvider = info.provider || "none";
    const badge = document.getElementById("llm-route-badge");
    if (badge) {
      badge.textContent = label(info);
      badge.dataset.provider = info.provider || "none";
      badge.hidden = !info.provider;
    }
    return info;
  }

  function install() {
    applyVisuals();
    window.addEventListener("aida:airlock-cleared", applyVisuals);
    window.addEventListener("aida:llm-route-cleared", applyVisuals);
  }

  window.AIDA_LLM_SCOPE = {
    current,
    from,
    tag,
    allows,
    authorizeOnce,
    retrievalMode,
    consumeAccess,
    clearAccess,
    label,
    applyVisuals
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "memory_retrieval",
      reads: ["AIDA_RUNTIME.tokens.llm"],
      writes: ["document.documentElement.dataset.llmProvider"],
      requires: ["AIDA_RUNTIME", "AIDA_LLM_PROVIDER"],
      verifies: ["memory records and visible provider state share one normalized LLM scope"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
