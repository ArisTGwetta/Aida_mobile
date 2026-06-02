(function () {
  const MODULE_ID = "spine.bios.console";

  function $(id) {
    return document.getElementById(id);
  }

  function scrollToLatest() {
    const logs = $("bios-logs");
    if (!logs) return;

    requestAnimationFrame(() => {
      logs.scrollTop = logs.scrollHeight;
    });
  }

  function setLatest(message) {
    const latest = $("bios-latest");
    if (latest) latest.textContent = message;
  }

  function show() {
    const bios = $("bios-screen");
    if (bios) bios.style.display = "flex";
    scrollToLatest();
  }

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

  function install() {
    const logs = $("bios-logs");
    const last = logs?.lastElementChild?.textContent || ">>> BIOS ready.";
    setLatest(last);
    scrollToLatest();
  }

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

  document.addEventListener("DOMContentLoaded", install);
})();
