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
    const bios = $("bios-screen");
    if (bios) bios.style.display = "block";
  }

  function getProvider() {
    return window.AIDA_TOKEN_FRAGMENTS || null;
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

  function assembleOpenAIKey(cleanPin) {
    const provider = getProvider();
    if (!provider || !provider.openai || !provider.openai.segments) {
      throw new Error("Private token fragment provider not loaded.");
    }

    const prefix = provider.openai.prefix || "";
    const segments = provider.openai.segments;
    const parts = cleanPin.split("").map((digit) => {
      const segment = segments[digit];
      if (!segment) throw new Error(`Missing key fragment for digit ${digit}.`);
      return segment;
    });

    return `${prefix}${parts.join("")}`;
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
      const key = assembleOpenAIKey(cleanPin);
      sessionStorage.setItem(STORAGE_KEY, key);

      const rt = runtime();
      rt.tokens.openai.key = key;
      rt.tokens.openai.source = "airlock_fragments";
      rt.boot.airlockCleared = true;
      rt.boot.phase = "airlock_cleared";

      hideAirlock();
      showBios();
      log("AIRLOCK: OpenAI key assembled into runtime token vault.", "log-blue");
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
    rt.boot.airlockCleared = true;
    log("AIRLOCK: Restored OpenAI token from this browser session.", "log-blue");
    return true;
  }

  function install() {
    const begin = $("airlock-start-btn");
    const input = $("scramble-pin");
    const keys = document.querySelectorAll("#airlock .key");

    if (begin) begin.addEventListener("click", showAirlock);

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
    pressKey,
    requestToken,
    restoreTokenFromSession
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
