// AIDA REVIEW BLOCK 1: File header - AIDA_ONE_SPINE\spine\bios_console.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
(function () {
  const MODULE_ID = "spine.bios.console";

// AIDA REVIEW BLOCK 3: Function $ - callable behavior in this runtime organ.
  function $(id) {
    return document.getElementById(id);
  }

// AIDA REVIEW BLOCK 4: Function scrollToLatest - callable behavior in this runtime organ.
  function scrollToLatest() {
    const logs = $("bios-logs");
    if (!logs) return;

    requestAnimationFrame(() => {
      logs.scrollTop = logs.scrollHeight;
    });
  }

// AIDA REVIEW BLOCK 5: Function setLatest - callable behavior in this runtime organ.
  function setLatest(message) {
    const latest = $("bios-latest");
    if (latest) latest.textContent = message;
  }

// AIDA REVIEW BLOCK 6: Function show - callable behavior in this runtime organ.
  function show() {
    const bios = $("bios-screen");
    if (bios) bios.style.display = "flex";
    scrollToLatest();
  }

// AIDA REVIEW BLOCK 7: Function log - callable behavior in this runtime organ.
  function log(message, className = "log-green") {
    const logs = $("bios-logs");
    const text = `>>> ${message}`;

    if (logs) {
      const line = document.createElement("div");
      line.className = className;
      line.textContent = text;
      logs.appendChild(line);
      scrollToLatest();
    }

    setLatest(text);

    if (window.AIDA_BODY?.pulse) {
      window.AIDA_BODY.pulse(message);
    }
  }

// AIDA REVIEW BLOCK 8: Function install - callable behavior in this runtime organ.
  function install() {
    const logs = $("bios-logs");
    const last = logs?.lastElementChild?.textContent || ">>> BIOS ready.";
    setLatest(last);
    scrollToLatest();
  }

// AIDA REVIEW BLOCK 9: Browser export AIDA_BIOS - exposes this organ to the page runtime.
  window.AIDA_BIOS = {
    log,
    show,
    scrollToLatest,
    setLatest
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "bios_console",
      reads: ["#bios-logs"],
      writes: ["#bios-logs", "#bios-latest"],
      requires: [],
      verifies: ["BIOS log scrolls to latest activity when visible"]
    });
  }

// AIDA REVIEW BLOCK 10: Browser event wiring - connects page lifecycle or user actions to this organ.
  document.addEventListener("DOMContentLoaded", install);
})();
