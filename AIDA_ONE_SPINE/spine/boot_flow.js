// AIDA REVIEW BLOCK 1: File header - AIDA_ONE_SPINE\spine\boot_flow.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
(function () {
  const MODULE_ID = "spine.boot.flow";
  const OAUTH_WAIT_MS = 30000;
  let pendingWakeAfterAirlock = false;
  let waking = false;

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
    }
  }

// AIDA REVIEW BLOCK 6: Function delay - callable behavior in this runtime organ.
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

// AIDA REVIEW BLOCK 7: Function waitFor - callable behavior in this runtime organ.
  async function waitFor(predicate, timeoutMs, label) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (predicate()) return true;
      await delay(250);
    }

    throw new Error(`${label} did not complete in time.`);
  }

// AIDA REVIEW BLOCK 8: Function ensureDriveConnected - callable behavior in this runtime organ.
  async function ensureDriveConnected() {
    const rt = runtime();
    if (rt.tokens?.drive?.accessToken) return true;

    log("WAKE: Requesting Drive OAuth.", "log-amber");
    window.AIDA_DRIVE?.requestDriveToken?.();
    await waitFor(
      () => Boolean(runtime().tokens?.drive?.accessToken),
      OAUTH_WAIT_MS,
      "Drive OAuth"
    );
    return true;
  }

// AIDA REVIEW BLOCK 9: Function ensureDriveLoaded - callable behavior in this runtime organ.
  async function ensureDriveLoaded() {
    const rt = runtime();
    if (rt.boot?.driveLoaded && Object.keys(rt.drive?.files || {}).length) return true;

    log("WAKE: Fetching Drive JSON.", "log-amber");
    await window.AIDA_DRIVE?.fetchAllDriveJson?.();

    if (!runtime().boot?.driveLoaded) {
      throw new Error("Drive JSON fetch did not complete.");
    }

    window.AIDA_WHILE_AWAY?.buildThought?.();
    return true;
  }

// AIDA REVIEW BLOCK 10: Function ensureAirlock - callable behavior in this runtime organ.
  function ensureAirlock() {
    const rt = runtime();
    if (rt.boot?.airlockCleared && window.AIDA_LLM_PROVIDER?.readiness?.().pass) return true;

    pendingWakeAfterAirlock = true;
    log("WAKE: Airlock required. Enter an available route, then OK.", "log-amber");
    window.AIDA_AIRLOCK?.inspectRoutes?.();
    window.AIDA_AIRLOCK?.show?.();
    return false;
  }

// AIDA REVIEW BLOCK 11: Function buildMessages - callable behavior in this runtime organ.
  function buildMessages() {
    const result = window.AIDA_LLM_MESSAGES?.build?.("");
    if (!result || result.blocked) {
      const missing = result?.missing?.join(", ") || "message builder";
      throw new Error(`Message build blocked: ${missing}.`);
    }

    log("WAKE: LLM messages assembled.", "log-blue");
    return true;
  }

// AIDA REVIEW BLOCK 12: Function arrive - callable behavior in this runtime organ.
  function arrive() {
    if (typeof window.aida_arrive === "function") {
      log("WAKE: Arriving into Aida body.", "log-blue");
      window.aida_arrive();
      setTimeout(() => {
        window.AIDA_WHILE_AWAY?.offerThought?.();
      }, 4700);
      return true;
    }

    throw new Error("Awake body arrival routine is missing.");
  }

// AIDA REVIEW BLOCK 13: Function continueWake - callable behavior in this runtime organ.
  async function continueWake() {
    buildMessages();
    arrive();
    const rt = runtime();
    if (rt) rt.boot.phase = "wake_complete";
    log("WAKE: Aida wake flow complete.", "log-blue");
    return true;
  }

// AIDA REVIEW BLOCK 14: Function wakeAida - callable behavior in this runtime organ.
  async function wakeAida() {
    if (waking) {
      log("WAKE: Wake flow already in progress.", "log-amber");
      return false;
    }

    waking = true;
    const button = $("wake-aida-btn");
    if (button) button.disabled = true;

    try {
      window.AIDA_BODY?.prepareWakeScreen?.();
      log("WAKE: Starting Aida wake flow.", "log-blue");
      await ensureDriveConnected();
      await ensureDriveLoaded();
      if (!ensureAirlock()) return false;
      await continueWake();
      return true;
    } catch (error) {
      log(`WAKE: ${error.message}`, "log-amber");
      return false;
    } finally {
      waking = false;
      if (button) button.disabled = false;
    }
  }

// AIDA REVIEW BLOCK 15: Function resumeAfterAirlock - callable behavior in this runtime organ.
  async function resumeAfterAirlock() {
    if (!pendingWakeAfterAirlock) return;
    pendingWakeAfterAirlock = false;

    try {
      await continueWake();
    } catch (error) {
      log(`WAKE: ${error.message}`, "log-amber");
    }
  }

// AIDA REVIEW BLOCK 16: Function install - callable behavior in this runtime organ.
  function install() {
    const button = $("wake-aida-btn");
    if (button) button.addEventListener("click", wakeAida);
    window.addEventListener("aida:airlock-cleared", resumeAfterAirlock);
    log("Wake flow organ loaded.", "log-blue");
  }

// AIDA REVIEW BLOCK 17: Browser export AIDA_BOOT_FLOW - exposes this organ to the page runtime.
  window.AIDA_BOOT_FLOW = {
    wakeAida,
    continueWake
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "wake_flow",
      reads: ["AIDA_RUNTIME.boot", "AIDA_RUNTIME.tokens", "AIDA_RUNTIME.context"],
      writes: ["AIDA_RUNTIME.boot.phase"],
      requires: ["AIDA_DRIVE", "AIDA_AIRLOCK", "AIDA_LLM_MESSAGES", "AIDA_BODY"],
      verifies: ["Wake flow automates Drive fetch, airlock handoff, message build, and body arrival"]
    });
  }

// AIDA REVIEW BLOCK 18: Browser event wiring - connects page lifecycle or user actions to this organ.
  document.addEventListener("DOMContentLoaded", install);
})();
