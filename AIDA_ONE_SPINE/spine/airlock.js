(function () {
  const MODULE_ID = "spine.airlock";
  const MAX_REAL_DIGITS = 3;
  const STORAGE_KEY = "aida_active_key";

  function $(id) {
    return document.getElementById(id);
  }

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function log(message, className = "log-green") {
    if (window.AIDA_BIOS?.log) {
      window.AIDA_BIOS.log(message, className);
      const status = $("airlock-status");
      if (status) status.textContent = message;
      return;
    }

    const logs = $("bios-logs");
    const status = $("airlock-status");

    if (status) status.textContent = message;

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

  function showAirlock() {
    const bios = $("bios-screen");
    const airlock = $("airlock");
    const input = $("scramble-pin");

    if (bios) bios.style.display = "none";
    if (airlock) airlock.style.display = "flex";
    if (input) {
      input.value = "";
      input.dataset.realPin = "";
    }

    const rt = runtime();
    if (rt) rt.boot.phase = "airlock";
  }

  function hideAirlock() {
    const airlock = $("airlock");
    if (airlock) airlock.style.display = "none";
  }

  function showBios() {
    if (window.AIDA_BIOS?.show) {
      window.AIDA_BIOS.show();
      return;
    }

    const bios = $("bios-screen");
    if (bios) bios.style.display = "flex";
    const logs = $("bios-logs");
    if (logs) logs.scrollTop = logs.scrollHeight;
  }

  function returnToBios() {
    hideAirlock();
    showBios();
    const rt = runtime();
    if (rt) rt.boot.phase = rt.boot.airlockCleared ? "airlock_cleared" : "bios";
    log("AIRLOCK: Returned to BIOS.", "log-blue");
  }

  function getProvider() {
    const rt = runtime();
    return rt.tokens?.llm?.fragments || rt.tokens?.openai?.fragments || window.AIDA_TOKEN_FRAGMENTS || null;
  }

  function meaningfulDigits(rawPin) {
    return (rawPin || "").replace(/0/g, "");
  }

  function pressKey(value) {
    const input = $("scramble-pin");
    if (!input) return;

    if (!input.dataset.realPin) input.dataset.realPin = "";

    if (value === "CLR") {
      input.value = "";
      input.dataset.realPin = "";
      return;
    }

    if (value === "0") {
      input.dataset.realPin += value;
      input.value = "*".repeat(input.dataset.realPin.length);
      return;
    }

    const realDigits = meaningfulDigits(input.dataset.realPin);
    if (realDigits.length >= MAX_REAL_DIGITS) return;

    input.dataset.realPin += value;
    input.value = "*".repeat(input.dataset.realPin.length);
  }

  function assembleRouteKey(route, cleanPin) {
    const prefix = route.prefix || "";
    const segments = route.segments || {};
    const parts = cleanPin.split("").map((digit) => {
      const segment = segments[digit];
      if (!segment) throw new Error(`Missing key fragment for digit ${digit}.`);
      return segment;
    });

    return `${prefix}${parts.join("")}`;
  }

  function resolveRoute(provider, cleanPin) {
    if (provider.routes && provider.routes[cleanPin]) {
      return provider.routes[cleanPin];
    }

    if (provider.openai?.segments) {
      return {
        label: "OpenAI default",
        provider: "openai",
        profile: "default",
        prefix: provider.openai.prefix || "",
        segments: provider.openai.segments
      };
    }

    return null;
  }

  function assembleLlmKey(cleanPin) {
    const provider = getProvider();
    if (!provider) {
      throw new Error("Private LLM fragment provider not loaded.");
    }

    const route = resolveRoute(provider, cleanPin);
    if (!route) {
      throw new Error(`No LLM route configured for ${cleanPin}.`);
    }

    return {
      key: assembleRouteKey(route, cleanPin),
      route
    };
  }

  function safeRoutes() {
    const provider = getProvider();
    if (!provider?.routes) return [];

    return Object.entries(provider.routes).map(([pin, route]) => ({
      pin,
      label: route.label || route.profile || "Unnamed route",
      provider: route.provider || "openai",
      profile: route.profile || pin,
      hasSegments: Boolean(route.segments)
    }));
  }

  function inspectRoutes() {
    const routes = safeRoutes();
    if (!routes.length) {
      log("AIRLOCK: No Drive-backed LLM routes loaded yet.", "log-amber");
      return routes;
    }

    log(`AIRLOCK: ${routes.length} LLM route(s) available.`, "log-blue");
    routes.forEach((route) => {
      log(`AIRLOCK ROUTE: ${route.pin} -> ${route.label} (${route.provider}/${route.profile})`);
    });
    return routes;
  }

  function inspectFromAirlock() {
    if (window.AIDA_CONTEXT_INSPECTOR?.inspect) {
      window.AIDA_CONTEXT_INSPECTOR.inspect();
    }
    return inspectRoutes();
  }

  function requestToken() {
    const input = $("scramble-pin");
    const rawPin = input?.dataset.realPin || "";
    const cleanPin = meaningfulDigits(rawPin);

    if (cleanPin.length !== MAX_REAL_DIGITS) {
      log(`AIRLOCK: Need ${MAX_REAL_DIGITS} meaningful digits; received ${cleanPin.length}.`, "log-amber");
      if (input) {
        input.value = "";
        input.dataset.realPin = "";
      }
      return false;
    }

    try {
      const assembled = assembleLlmKey(cleanPin);
      const key = assembled.key;
      const route = assembled.route;
      sessionStorage.setItem(STORAGE_KEY, key);

      const rt = runtime();
      rt.tokens.llm.key = key;
      rt.tokens.llm.provider = route.provider || "openai";
      rt.tokens.llm.profile = route.profile || cleanPin;
      rt.tokens.llm.source = "airlock_route";

      if (rt.tokens.llm.provider === "openai") {
        rt.tokens.openai.key = key;
        rt.tokens.openai.source = "airlock_route";
      } else {
        rt.tokens.openai.key = null;
        rt.tokens.openai.source = null;
      }

      rt.boot.airlockCleared = true;
      rt.boot.phase = "airlock_cleared";

      hideAirlock();
      showBios();
      log(`AIRLOCK: ${route.label || route.profile || "LLM route"} assembled into runtime token vault.`, "log-blue");
      return true;
    } catch (error) {
      log(`AIRLOCK: ${error.message}`, "log-amber");
      return false;
    }
  }

  function restoreTokenFromSession() {
    const key = sessionStorage.getItem(STORAGE_KEY);
    if (!key) return false;
    const rt = runtime();
    rt.tokens.openai.key = key;
    rt.tokens.openai.source = "sessionStorage";
    rt.tokens.llm.key = key;
    rt.tokens.llm.provider = rt.tokens.llm.provider || "openai";
    rt.tokens.llm.profile = rt.tokens.llm.profile || "restored_session";
    rt.tokens.llm.source = "sessionStorage";
    rt.boot.airlockCleared = true;
    log("AIRLOCK: Restored OpenAI token from this browser session.", "log-blue");
    return true;
  }

  function install() {
    const begin = $("airlock-start-btn");
    const inspect = $("airlock-inspect-btn");
    const bios = $("airlock-bios-btn");
    const input = $("scramble-pin");
    const keys = document.querySelectorAll("#airlock .key");

    if (begin) begin.addEventListener("click", showAirlock);
    if (inspect) inspect.addEventListener("click", inspectFromAirlock);
    if (bios) bios.addEventListener("click", returnToBios);

    keys.forEach((button) => {
      const value = button.textContent.trim();
      if (value === "OK") {
        button.addEventListener("click", requestToken);
      } else if (!button.disabled) {
        button.addEventListener("click", () => pressKey(value));
      }
    });

    if (input) {
      input.value = "";
      input.dataset.realPin = "";
    }

    restoreTokenFromSession();
    log("Airlock module loaded. Waiting for private fragments or session token.", "log-blue");
  }

  window.AIDA_AIRLOCK = {
    show: showAirlock,
    returnToBios,
    pressKey,
    requestToken,
    restoreTokenFromSession,
    inspectFromAirlock,
    inspectRoutes,
    safeRoutes
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "airlock",
      reads: ["AIDA_TOKEN_FRAGMENTS.openai.segments", "sessionStorage.aida_active_key"],
      writes: ["AIDA_RUNTIME.tokens.openai.key", "AIDA_RUNTIME.boot.airlockCleared"],
      requires: ["AIDA_RUNTIME"],
      verifies: ["runtime token is set only after three meaningful non-zero digits"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
