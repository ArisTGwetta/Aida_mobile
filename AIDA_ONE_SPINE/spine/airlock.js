// AIDA REVIEW BLOCK 1: File header - AIDA_ONE_SPINE\spine\airlock.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
(function () {
  const MODULE_ID = "spine.airlock";
  const MAX_REAL_DIGITS = 3;
  const STORAGE_KEY = "aida_active_key";
  const STORAGE_ROUTE = "aida_active_route";

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

// AIDA REVIEW BLOCK 6: Function showAirlock - callable behavior in this runtime organ.
  async function showAirlock() {
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
    let routes = safeRoutes();
    if (!routes.length && rt?.tokens?.drive?.accessToken && window.AIDA_DRIVE?.fetchAllDriveJson) {
      log("AIRLOCK: Refreshing private routes from Drive...", "log-blue");
      try {
        await window.AIDA_DRIVE.fetchAllDriveJson();
        routes = safeRoutes();
        if (
          !routes.length &&
          rt.drive?.fileIndex?.["llm_fragments.json"] &&
          window.AIDA_DRIVE?.fetchJsonByName
        ) {
          log("AIRLOCK: Route file is indexed but not mounted. Fetching it directly...", "log-blue");
          const fragments = await window.AIDA_DRIVE.fetchJsonByName(
            "llm_fragments.json",
            "airlock_direct"
          );
          rt.tokens.llm.fragments = fragments || null;
          routes = safeRoutes();
        }
      } catch (error) {
        log(`AIRLOCK: Drive route refresh failed. ${error.message}`, "log-amber");
      }
    }
    log(
      routes.length
        ? `AIRLOCK: Ready. ${routes.length} route(s) loaded.`
        : rt?.tokens?.drive?.accessToken
          ? "AIRLOCK: Drive was refreshed, but no LLM routes were loaded."
          : "AIRLOCK: Connect Drive first, or use Wake Aida for the full startup sequence.",
      routes.length ? "log-blue" : "log-amber"
    );
  }

// AIDA REVIEW BLOCK 7: Function hideAirlock - callable behavior in this runtime organ.
  function hideAirlock() {
    const airlock = $("airlock");
    if (airlock) airlock.style.display = "none";
  }

// AIDA REVIEW BLOCK 8: Function showBios - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 9: Function returnToBios - callable behavior in this runtime organ.
  function returnToBios() {
    hideAirlock();
    showBios();
    const rt = runtime();
    if (rt) rt.boot.phase = rt.boot.airlockCleared ? "airlock_cleared" : "bios";
    log("AIRLOCK: Returned to BIOS.", "log-blue");
  }

// AIDA REVIEW BLOCK 10: Function getProvider - callable behavior in this runtime organ.
  function getProvider() {
    const rt = runtime();
    return rt.tokens?.llm?.fragments || rt.tokens?.openai?.fragments || window.AIDA_TOKEN_FRAGMENTS || null;
  }

// AIDA REVIEW BLOCK 11: Function meaningfulDigits - callable behavior in this runtime organ.
  function meaningfulDigits(rawPin) {
    return (rawPin || "").replace(/0/g, "");
  }

// AIDA REVIEW BLOCK 12: Function pressKey - callable behavior in this runtime organ.
  function pressKey(value) {
    const input = $("scramble-pin");
    if (!input) return;

    if (!input.dataset.realPin) input.dataset.realPin = "";

    if (value === "CLR") {
      input.value = "";
      input.dataset.realPin = "";
      const status = $("airlock-status");
      if (status) status.textContent = "Zeros are decoys. Three meaningful fragments required.";
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
    const meaningfulCount = meaningfulDigits(input.dataset.realPin).length;
    const status = $("airlock-status");
    if (status) {
      status.textContent = meaningfulCount === MAX_REAL_DIGITS
        ? "Three meaningful digits entered. Press OK."
        : `${meaningfulCount} of ${MAX_REAL_DIGITS} meaningful digits entered.`;
    }
  }

// AIDA REVIEW BLOCK 13: Function assembleRouteKey - callable behavior in this runtime organ.
  function assembleRouteKey(route, cleanPin) {
    if (route.auth === "none" || route.requiresKey === false || route.provider === "ollama") {
      return null;
    }
    const prefix = route.prefix || "";
    const segments = route.segments || {};
    const parts = cleanPin.split("").map((digit) => {
      const segment = segments[digit];
      if (!segment) throw new Error(`Missing key fragment for digit ${digit}.`);
      return segment;
    });

    return `${prefix}${parts.join("")}`;
  }

// AIDA REVIEW BLOCK 14: Function resolveRoute - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 15: Function assembleLlmKey - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 16: Function safeRoutes - callable behavior in this runtime organ.
  function safeRoutes() {
    const provider = getProvider();
    if (!provider?.routes) return [];

    return Object.entries(provider.routes).map(([pin, route]) => ({
      pin,
      label: route.label || route.profile || "Unnamed route",
      provider: route.provider || "openai",
      profile: route.profile || pin,
      model: route.model || null,
      requiresKey: !(route.auth === "none" || route.requiresKey === false || route.provider === "ollama"),
      hasSegments: Boolean(route.segments)
    }));
  }

// AIDA REVIEW BLOCK 17: Function safeRouteMetadata - callable behavior in this runtime organ.
  function safeRouteMetadata(route, cleanPin) {
    return {
      provider: route.provider || "openai",
      profile: route.profile || cleanPin,
      model: route.model || null,
      endpoint: route.provider === "ollama" ? route.endpoint || null : null,
      auth: route.auth || (route.provider === "ollama" ? "none" : "bearer")
    };
  }

// AIDA REVIEW BLOCK 18: Function applyRouteToRuntime - callable behavior in this runtime organ.
  function applyRouteToRuntime(routeMetadata, key, source) {
    const rt = runtime();
    rt.tokens.llm.key = key || null;
    rt.tokens.llm.provider = routeMetadata.provider || "openai";
    rt.tokens.llm.profile = routeMetadata.profile || "default";
    rt.tokens.llm.model = routeMetadata.model || null;
    rt.tokens.llm.endpoint = routeMetadata.endpoint || null;
    rt.tokens.llm.auth = routeMetadata.auth || (rt.tokens.llm.provider === "ollama" ? "none" : "bearer");
    rt.tokens.llm.source = source;

    if (rt.tokens.llm.provider === "openai") {
      rt.tokens.openai.key = key || null;
      rt.tokens.openai.source = source;
    } else {
      rt.tokens.openai.key = null;
      rt.tokens.openai.source = null;
    }
  }

// AIDA REVIEW BLOCK 19: Function inspectRoutes - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 20: Function inspectFromAirlock - callable behavior in this runtime organ.
  function inspectFromAirlock() {
    if (window.AIDA_CONTEXT_INSPECTOR?.inspect) {
      window.AIDA_CONTEXT_INSPECTOR.inspect();
    }
    return inspectRoutes();
  }

// AIDA REVIEW BLOCK 21: Function requestToken - callable behavior in this runtime organ.
  function requestToken() {
    const input = $("scramble-pin");
    const rawPin = input?.dataset.realPin || "";
    const cleanPin = meaningfulDigits(rawPin);
    const status = $("airlock-status");
    if (status) status.textContent = `Checking route ${cleanPin || "..."}...`;

    if (cleanPin.length !== MAX_REAL_DIGITS) {
      log(`AIRLOCK: Need ${MAX_REAL_DIGITS} meaningful digits; received ${cleanPin.length}.`, "log-amber");
      if (input) {
        input.value = "";
        input.dataset.realPin = "";
      }
      return false;
    }

    try {
      const available = safeRoutes();
      if (!available.some((item) => item.pin === cleanPin)) {
        throw new Error(
          available.length
            ? `Route ${cleanPin} is not loaded. Available routes: ${available.map((item) => item.pin).join(", ")}.`
            : "No routes are loaded. Return to BIOS and Fetch Drive JSON."
        );
      }
      const assembled = assembleLlmKey(cleanPin);
      const key = assembled.key;
      const route = assembled.route;
      const routeMetadata = safeRouteMetadata(route, cleanPin);
      if (key) sessionStorage.setItem(STORAGE_KEY, key);
      else sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.setItem(STORAGE_ROUTE, JSON.stringify(routeMetadata));

      const rt = runtime();
      applyRouteToRuntime(routeMetadata, key, "airlock_route");

      rt.boot.airlockCleared = true;
      rt.boot.phase = "airlock_cleared";

      hideAirlock();
      showBios();
      log(`AIRLOCK: ${route.label || route.profile || "LLM route"} assembled into runtime token vault.`, "log-blue");
      window.dispatchEvent(new CustomEvent("aida:airlock-cleared", {
        detail: {
          provider: rt.tokens.llm.provider,
          profile: rt.tokens.llm.profile
        }
      }));
      return true;
    } catch (error) {
      log(`AIRLOCK: ${error.message}`, "log-amber");
      return false;
    }
  }

// AIDA REVIEW BLOCK 22: Function restoreTokenFromSession - callable behavior in this runtime organ.
  function restoreTokenFromSession() {
    const key = sessionStorage.getItem(STORAGE_KEY);
    const rawRoute = sessionStorage.getItem(STORAGE_ROUTE);
    if (!key && !rawRoute) return false;

    let routeMetadata = null;
    try {
      routeMetadata = rawRoute ? JSON.parse(rawRoute) : null;
    } catch (_) {
      sessionStorage.removeItem(STORAGE_ROUTE);
    }
    routeMetadata = routeMetadata || {
      provider: "openai",
      profile: "restored_session",
      model: null,
      endpoint: null,
      auth: "bearer"
    };
    if (routeMetadata.provider !== "ollama" && !key) return false;

    const rt = runtime();
    applyRouteToRuntime(routeMetadata, key, "sessionStorage");
    rt.boot.airlockCleared = true;
    log(`AIRLOCK: Restored ${routeMetadata.provider} route from this browser session.`, "log-blue");
    return true;
  }

// AIDA REVIEW BLOCK 23: Function clearSessionCredentials - callable behavior in this runtime organ.
  function clearSessionCredentials(reason = "session_complete") {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_ROUTE);

    const rt = runtime();
    if (rt?.tokens?.llm) {
      rt.tokens.llm.key = null;
      rt.tokens.llm.provider = null;
      rt.tokens.llm.profile = null;
      rt.tokens.llm.model = null;
      rt.tokens.llm.endpoint = null;
      rt.tokens.llm.auth = null;
      rt.tokens.llm.source = null;
    }
    if (rt?.tokens?.openai) {
      rt.tokens.openai.key = null;
      rt.tokens.openai.source = null;
    }
    if (rt?.boot) {
      rt.boot.airlockCleared = false;
      rt.boot.phase = reason;
    }

    const input = $("scramble-pin");
    if (input) {
      input.value = "";
      input.dataset.realPin = "";
    }
    window.dispatchEvent(new CustomEvent("aida:llm-route-cleared", {
      detail: { reason }
    }));
    log("AIRLOCK: Active route credentials cleared for the completed session.", "log-blue");
    return true;
  }

// AIDA REVIEW BLOCK 24: Function install - callable behavior in this runtime organ.
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
      if (button.dataset.airlockBound === "true") return;
      button.dataset.airlockBound = "true";
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

    if (document.documentElement?.dataset.airlockInstalled !== "true") {
      if (document.documentElement) document.documentElement.dataset.airlockInstalled = "true";
      restoreTokenFromSession();
    }
    log("Airlock module loaded. Waiting for private fragments or session token.", "log-blue");
  }

// AIDA REVIEW BLOCK 25: Browser export AIDA_AIRLOCK - exposes this organ to the page runtime.
  window.AIDA_AIRLOCK = {
    show: showAirlock,
    returnToBios,
    pressKey,
    requestToken,
    restoreTokenFromSession,
    clearSessionCredentials,
    inspectFromAirlock,
    inspectRoutes,
    safeRoutes
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "airlock",
      reads: ["AIDA_TOKEN_FRAGMENTS.routes", "sessionStorage.aida_active_key", "sessionStorage.aida_active_route"],
      writes: ["AIDA_RUNTIME.tokens.llm", "AIDA_RUNTIME.tokens.openai.key", "AIDA_RUNTIME.boot.airlockCleared"],
      requires: ["AIDA_RUNTIME"],
      verifies: ["runtime token is set only after three meaningful non-zero digits; completed sessions clear active route credentials"]
    });
  }

  if (document.readyState === "loading") {
// AIDA REVIEW BLOCK 26: Browser event wiring - connects page lifecycle or user actions to this organ.
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
