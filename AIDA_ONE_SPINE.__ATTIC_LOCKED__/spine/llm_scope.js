// AIDA REVIEW BLOCK 1: File header - AIDA_ONE_SPINE\spine\llm_scope.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
(function () {
  const MODULE_ID = "spine.llm.scope";

// AIDA REVIEW BLOCK 3: Function runtime - callable behavior in this runtime organ.
  function runtime() {
    return window.AIDA_RUNTIME;
  }

// AIDA REVIEW BLOCK 4: Function normalize - callable behavior in this runtime organ.
  function normalize(value) {
    return window.AIDA_LLM_PROVIDER?.normalizeProvider?.(value) || String(value || "").toLowerCase();
  }

// AIDA REVIEW BLOCK 5: Function current - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 6: Function ensureAccess - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 7: Function authorizeOnce - callable behavior in this runtime organ.
  function authorizeOnce(mode = "current", reason = "explicit_user_request") {
    const access = ensureAccess();
    access.mode = mode === "all" ? "all" : "current";
    access.oneUse = access.mode === "all";
    access.reason = reason;
    access.grantedAt = new Date().toISOString();
    return { ...access };
  }

// AIDA REVIEW BLOCK 8: Function retrievalMode - callable behavior in this runtime organ.
  function retrievalMode() {
    return ensureAccess().mode === "all" ? "all" : "current";
  }

// AIDA REVIEW BLOCK 9: Function consumeAccess - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 10: Function clearAccess - callable behavior in this runtime organ.
  function clearAccess() {
    const access = ensureAccess();
    access.mode = "current";
    access.oneUse = false;
    access.reason = null;
    access.grantedAt = null;
    return { ...access };
  }

// AIDA REVIEW BLOCK 11: Function from - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 12: Function tag - callable behavior in this runtime organ.
  function tag(target, source = current()) {
    if (!target || typeof target !== "object") return target;
    target.llm_provider = source.provider || null;
    target.llm_profile = source.profile || null;
    target.llm_model = source.model || null;
    target.llm_scope = source.scope || source.provider || "shared";
    return target;
  }

// AIDA REVIEW BLOCK 13: Function allows - callable behavior in this runtime organ.
  function allows(value, options = {}) {
    if (options.scope === "all") return true;
    const active = options.provider ? normalize(options.provider) : current().provider;
    if (!active) return true;
    const entryScope = from(value, options.fallback || "shared");
    return entryScope.scope === "shared" || entryScope.provider === active;
  }

// AIDA REVIEW BLOCK 14: Function label - callable behavior in this runtime organ.
  function label(info = current()) {
    if (info.provider === "xai") return "GROK Â· HOSTED";
    if (info.provider === "ollama") return "DEBUG Â· LOCAL";
    if (info.provider === "openai") return "OPENAI Â· HOSTED";
    return "LLM Â· UNSELECTED";
  }

// AIDA REVIEW BLOCK 15: Function applyVisuals - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 16: Function install - callable behavior in this runtime organ.
  function install() {
    applyVisuals();
    window.addEventListener("aida:airlock-cleared", applyVisuals);
    window.addEventListener("aida:llm-route-cleared", applyVisuals);
  }

// AIDA REVIEW BLOCK 17: Browser export AIDA_LLM_SCOPE - exposes this organ to the page runtime.
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
// AIDA REVIEW BLOCK 18: Browser event wiring - connects page lifecycle or user actions to this organ.
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
