(function () {
  const MODULE_ID = "spine.boot.flow";
  const OAUTH_WAIT_MS = 30000;
  let pendingWakeAfterAirlock = false;
  let waking = false;

  function $(id) {
    return document.getElementById(id);
  }

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function log(message, className = "log-green") {
    if (window.AIDA_BIOS?.log) {
      window.AIDA_BIOS.log(message, className);
    }
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitFor(predicate, timeoutMs, label) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (predicate()) return true;
      await delay(250);
    }

    throw new Error(`${label} did not complete in time.`);
  }

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

  function ensureAirlock() {
    const rt = runtime();
    if (rt.boot?.airlockCleared && rt.tokens?.llm?.key) return true;

    pendingWakeAfterAirlock = true;
    log("WAKE: Airlock required. Enter route 123, then OK.", "log-amber");
    window.AIDA_AIRLOCK?.inspectRoutes?.();
    window.AIDA_AIRLOCK?.show?.();
    return false;
  }

  function buildMessages() {
    const result = window.AIDA_LLM_MESSAGES?.build?.("");
    if (!result || result.blocked) {
      const missing = result?.missing?.join(", ") || "message builder";
      throw new Error(`Message build blocked: ${missing}.`);
    }

    log("WAKE: LLM messages assembled.", "log-blue");
    return true;
  }

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

  async function continueWake() {
    buildMessages();
    arrive();
    const rt = runtime();
    if (rt) rt.boot.phase = "wake_complete";
    log("WAKE: Aida wake flow complete.", "log-blue");
    return true;
  }

  async function wakeAida() {
    if (waking) {
      log("WAKE: Wake flow already in progress.", "log-amber");
      return false;
    }

    waking = true;
    const button = $("wake-aida-btn");
    if (button) button.disabled = true;

    try {
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

  async function resumeAfterAirlock() {
    if (!pendingWakeAfterAirlock) return;
    pendingWakeAfterAirlock = false;

    try {
      await continueWake();
    } catch (error) {
      log(`WAKE: ${error.message}`, "log-amber");
    }
  }

  function install() {
    const button = $("wake-aida-btn");
    if (button) button.addEventListener("click", wakeAida);
    window.addEventListener("aida:airlock-cleared", resumeAfterAirlock);
    log("Wake flow organ loaded.", "log-blue");
  }

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

  document.addEventListener("DOMContentLoaded", install);
})();
