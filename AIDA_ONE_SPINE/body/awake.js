(function () {
  const ASSET_BASE = "body/assets/";
  const DEFAULT_FACE = `${ASSET_BASE}neutral1.png`;

  function $(id) {
    return document.getElementById(id);
  }

  function runtime() {
    return window.AIDA_RUNTIME || null;
  }

  function setBootPhase(phase) {
    const rt = runtime();
    if (rt) rt.boot.phase = phase;
  }

  function appendBios(message, className = "log-green") {
    const logs = $("bios-logs");
    if (!logs) return;
    const line = document.createElement("div");
    line.className = className;
    line.textContent = `>>> ${message}`;
    logs.appendChild(line);
    logs.scrollTop = logs.scrollHeight;
  }

  function appendChat(role, text) {
    const flow = $("chat-flow");
    if (!flow) return;
    const line = document.createElement("div");
    line.className = `line ${role}`;
    line.textContent = text;
    flow.appendChild(line);
    flow.scrollTop = flow.scrollHeight;
  }

  function pulse(message) {
    const log = $("log-content");
    if (!log) return;
    const line = document.createElement("div");
    line.textContent = `> ${message}`;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  function buildPixelGrid() {
    const grid = $("pixelGrid");
    if (!grid) return;
    grid.innerHTML = "";
    for (let i = 0; i < 20; i += 1) {
      const cell = document.createElement("div");
      cell.style.setProperty("--dx", Math.random().toString());
      cell.style.setProperty("--dy", Math.random().toString());
      grid.appendChild(cell);
    }
  }

  function buildSparks() {
    const layer = $("sparkLayer");
    if (!layer) return;
    layer.innerHTML = "";
    for (let i = 0; i < 36; i += 1) {
      const spark = document.createElement("div");
      spark.className = "spark";
      spark.style.left = `${Math.random() * 100}%`;
      spark.style.top = `${Math.random() * 100}%`;
      spark.style.animationDelay = `${Math.random() * 1.2}s`;
      layer.appendChild(spark);
    }
  }

  function buildFaceDataGrid(id, count, durationRange, opacityRange) {
    const grid = $(id);
    if (!grid) return;
    grid.innerHTML = "";
    for (let i = 0; i < count; i += 1) {
      const cell = document.createElement("span");
      const duration = durationRange[0] + Math.random() * (durationRange[1] - durationRange[0]);
      const delay = Math.random() * duration;
      const opacity = opacityRange[0] + Math.random() * (opacityRange[1] - opacityRange[0]);
      cell.style.setProperty("--blink-duration", `${Math.round(duration)}ms`);
      cell.style.setProperty("--blink-delay", `${Math.round(delay)}ms`);
      cell.style.setProperty("--blink-opacity", opacity.toFixed(2));
      grid.appendChild(cell);
    }
  }

  function buildFaceDataGrids() {
    buildFaceDataGrid("face-data-slow", 120, [4200, 8600], [0.18, 0.42]);
    buildFaceDataGrid("face-data-fast", 396, [900, 2600], [0.12, 0.36]);
  }

  function installTagEditor() {
    const tagButtons = document.querySelectorAll(".tag-btn");
    const tagEdit = $("tag-edit");
    let activeTagIndex = null;
    if (!tagEdit || !tagButtons.length) return;

    tagButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTagIndex = btn.dataset.index;
        tagEdit.value = btn.textContent === "#" ? "" : btn.textContent;
        tagEdit.style.display = "block";
        tagEdit.focus();
      });
    });

    tagEdit.addEventListener("blur", () => {
      if (activeTagIndex === null) return;
      const btn = document.querySelector(`.tag-btn[data-index="${activeTagIndex}"]`);
      const val = tagEdit.value.trim();
      if (btn) {
        btn.textContent = val || "#";
        btn.classList.toggle("used", Boolean(val));
      }
      tagEdit.style.display = "none";
      activeTagIndex = null;
    });
  }

  function installInputPlaceholders() {
    const input = $("user-in");
    const send = $("send-btn");
    const realms = $("eject-btn");
    const sleep = $("sleep-btn");

    if (send && input) {
      send.addEventListener("click", () => {
        const text = input.value.trim();
        if (!text) return;
        input.value = "";
        appendChat("USER", text);
        appendChat("AIDA", "Body received the signal. The mind is not mounted yet.");
        pulse("Conversation hook fired; waiting for spine/conversation transplant.");
      });
    }

    if (input) {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && send) send.click();
      });
    }

    if (realms) {
      realms.addEventListener("click", () => {
        pulse("Realm selector placeholder. Project/realm spine will own this.");
      });
    }

    if (sleep) {
      sleep.addEventListener("click", () => {
        pulse("Sleep placeholder. Sleep spine will own journaling and while-away.");
        if (typeof window.aida_depart === "function") window.aida_depart();
      });
    }
  }

  function showBody() {
    const bios = $("bios-screen");
    const airlock = $("airlock");
    const iface = $("aida-interface");
    const engine = $("main-engine");
    if (bios) bios.style.display = "none";
    if (airlock) airlock.style.display = "none";
    if (iface) iface.style.display = "block";
    if (engine) engine.classList.remove("hidden");
  }

  function createHologramLayer() {
    const veil = $("veil");
    const portrait = $("aida-portrait");
    if (!veil || !portrait || $("holoFace")) return;

    const scanline = document.createElement("div");
    scanline.id = "holoScanline";
    Object.assign(scanline.style, {
      position: "absolute",
      top: "-20px",
      left: "0",
      width: "100%",
      height: "20px",
      background: "linear-gradient(to bottom, transparent, rgba(75,227,255,0.4), transparent)",
      opacity: "0",
      zIndex: "2001",
      pointerEvents: "none"
    });

    const beam = document.createElement("div");
    beam.id = "holoBeam";
    Object.assign(beam.style, {
      position: "absolute",
      bottom: "0",
      left: "50%",
      width: "2px",
      height: "0",
      background: "linear-gradient(to top, rgba(75,227,255,0.35), transparent)",
      transform: "translateX(-50%)",
      opacity: "0",
      zIndex: "2002",
      pointerEvents: "none"
    });

    const cone = document.createElement("div");
    cone.id = "holoCone";
    Object.assign(cone.style, {
      position: "absolute",
      bottom: "0",
      left: "50%",
      width: "0",
      height: "0",
      borderLeft: "0 solid transparent",
      borderRight: "0 solid transparent",
      borderTop: "0 solid rgba(75,227,255,0.15)",
      transform: "translateX(-50%) scaleY(1.25)",
      transformOrigin: "bottom center",
      opacity: "0",
      filter: "blur(2px)",
      zIndex: "2003",
      pointerEvents: "none"
    });

    const face = document.createElement("img");
    face.id = "holoFace";
    face.src = portrait.src || DEFAULT_FACE;
    Object.assign(face.style, {
      position: "absolute",
      bottom: "20%",
      left: "50%",
      width: "180px",
      height: "auto",
      transform: "translateX(-50%)",
      opacity: "0",
      filter: "grayscale(1) contrast(0.6) brightness(0.7)",
      zIndex: "2004",
      pointerEvents: "none",
      webkitMaskImage: "radial-gradient(circle, black 40%, transparent 80%)",
      maskImage: "radial-gradient(circle, black 40%, transparent 80%)"
    });

    veil.append(scanline, beam, cone, face);
  }

  function resetRitualElements() {
    const scanline = $("holoScanline");
    const beam = $("holoBeam");
    const cone = $("holoCone");
    const face = $("holoFace");

    if (scanline) {
      scanline.getAnimations().forEach((animation) => animation.cancel());
      scanline.style.opacity = "0";
      scanline.style.top = "-20px";
    }
    if (beam) {
      beam.getAnimations().forEach((animation) => animation.cancel());
      beam.style.opacity = "0";
      beam.style.height = "0";
    }
    if (cone) {
      cone.getAnimations().forEach((animation) => animation.cancel());
      cone.style.opacity = "0";
      cone.style.borderLeftWidth = "0";
      cone.style.borderRightWidth = "0";
      cone.style.borderTopWidth = "0";
    }
    if (face) {
      face.getAnimations().forEach((animation) => animation.cancel());
      Object.assign(face.style, {
        bottom: "20%",
        left: "50%",
        width: "180px",
        height: "auto",
        objectFit: "initial",
        transform: "translateX(-50%)",
        opacity: "0",
        filter: "grayscale(1) contrast(0.6) brightness(0.7)",
        webkitMaskImage: "radial-gradient(circle, black 40%, transparent 80%)",
        maskImage: "radial-gradient(circle, black 40%, transparent 80%)"
      });
    }
  }

  window.aida_arrive = function () {
    showBody();
    createHologramLayer();
    resetRitualElements();
    setBootPhase("body_arrival");

    const veil = $("veil");
    const scanline = $("holoScanline");
    const beam = $("holoBeam");
    const cone = $("holoCone");
    const face = $("holoFace");
    const flickerGrid = $("flicker-grid");
    const pixelGrid = $("pixelGrid");
    const sparkLayer = $("sparkLayer");
    const portraitPane = $("portrait-pane");
    const uiDock = $("input-dock");
    const dataStack = $("data-stack");
    const slowData = $("face-data-slow");
    const fastData = $("face-data-fast");

    if (!veil || !scanline || !beam || !cone || !face) return;

    [uiDock, dataStack, flickerGrid, pixelGrid, sparkLayer, portraitPane, slowData, fastData].forEach((el) => {
      if (el) el.style.opacity = "0";
    });

    veil.style.background = "black";
    veil.style.opacity = "1";
    veil.style.pointerEvents = "auto";

    setTimeout(() => {
      scanline.style.opacity = "1";
      scanline.animate(
        [{ top: "-20px" }, { top: "100%" }, { top: "-20px" }],
        { duration: 1200, easing: "linear", fill: "forwards" }
      );
    }, 500);

    setTimeout(() => {
      beam.style.opacity = "1";
      beam.animate([{ height: "0" }, { height: "260px" }], {
        duration: 400,
        easing: "ease-out",
        fill: "forwards"
      });

      cone.style.opacity = "1";
      cone.animate(
        [
          { borderLeftWidth: "0", borderRightWidth: "0", borderTopWidth: "0" },
          { borderLeftWidth: "80px", borderRightWidth: "80px", borderTopWidth: "200px" }
        ],
        { duration: 700, easing: "ease-out", fill: "forwards" }
      );
    }, 1500);

    setTimeout(() => {
      face.style.opacity = "0.3";
      face.animate(
        [{ opacity: 0.2 }, { opacity: 0.6 }, { opacity: 0.1 }, { opacity: 0.8 }],
        { duration: 800, easing: "steps(4)" }
      );
    }, 2200);

    setTimeout(() => {
      Object.assign(face.style, {
        bottom: "20%",
        width: "auto",
        height: "auto",
        opacity: "1",
        filter: "grayscale(0) contrast(1.1) brightness(1.2) drop-shadow(0 0 15px rgba(75,227,255,0.6))",
        webkitMaskImage: "radial-gradient(circle, black 40%, transparent 80%)",
        maskImage: "radial-gradient(circle, black 40%, transparent 80%)"
      });

      cone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" });
      beam.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" });
    }, 3000);

    setTimeout(() => {
      veil.style.background = "white";
      veil.style.opacity = "1";

      setTimeout(() => {
        Object.assign(face.style, {
          bottom: "0",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "translateX(-50%) scale(1.05)",
          webkitMaskImage: "none",
          maskImage: "none",
          filter: "none"
        });
        veil.style.background = "black";
      }, 150);

      setTimeout(() => {
        veil.style.background = "white";

        setTimeout(() => {
          face.style.opacity = "0";
          veil.style.background = "black";
          [uiDock, dataStack, flickerGrid, portraitPane].forEach((el) => {
            if (el) el.style.opacity = "1";
          });
          if (slowData) slowData.style.opacity = "";
          if (fastData) fastData.style.opacity = "";
          if (sparkLayer) sparkLayer.style.opacity = "0.35";

          setTimeout(() => {
            veil.style.opacity = "0";
            veil.style.pointerEvents = "none";
            const rt = runtime();
            if (rt) {
              rt.body.arrivalComplete = true;
              rt.boot.arrived = true;
              rt.boot.phase = "body_ready";
            }
            pulse("Awake body arrived. Mind transplant pending.");
          }, 300);
        }, 120);
      }, 700);
    }, 3800);
  };

  window.aida_depart = function () {
    createHologramLayer();
    const veil = $("veil");
    const beam = $("holoBeam");
    const cone = $("holoCone");
    const face = $("holoFace");
    const scanline = $("holoScanline");
    const uiDock = $("input-dock");
    const dataStack = $("data-stack");
    const flickerGrid = $("flicker-grid");

    if (!veil || !beam || !cone || !face || !scanline) return;
    setBootPhase("body_departure");

    [uiDock, dataStack, flickerGrid].forEach((el) => {
      if (el) el.style.opacity = "0";
    });

    face.style.opacity = "1";
    face.animate(
      [
        { transform: "translateX(-50%) scale(1)", opacity: 1 },
        { transform: "translateX(-50%) scale(1.02)", opacity: 0.6 },
        { transform: "translateX(-50%) scale(0.98)", opacity: 0.3 }
      ],
      { duration: 500, easing: "steps(3)" }
    );

    setTimeout(() => {
      beam.style.opacity = "1";
      cone.style.opacity = "1";
      face.animate(
        [
          { opacity: 0.3, filter: "grayscale(0)" },
          { opacity: 0.1, filter: "grayscale(1)" },
          { opacity: 0 }
        ],
        { duration: 1000, easing: "ease-out", fill: "forwards" }
      );
    }, 500);

    setTimeout(() => {
      scanline.style.opacity = "1";
      scanline.animate([{ top: "-20px" }, { top: "100%" }], {
        duration: 1000,
        easing: "ease-in"
      });
    }, 1500);

    setTimeout(() => {
      veil.style.background = "black";
      veil.style.opacity = "1";
      veil.style.pointerEvents = "auto";
      const rt = runtime();
      if (rt) rt.body.arrivalComplete = false;
    }, 2500);
  };

  window.AIDA_BODY = {
    arrive: window.aida_arrive,
    depart: window.aida_depart,
    appendChat,
    pulse,
    setFace(src) {
      const portrait = $("aida-portrait");
      if (portrait) portrait.src = src || DEFAULT_FACE;
      const rt = runtime();
      if (rt) rt.body.currentFace = src || DEFAULT_FACE;
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    const portrait = $("aida-portrait");
    if (portrait) {
      portrait.src = DEFAULT_FACE;
      const rt = runtime();
      if (rt) rt.body.currentFace = DEFAULT_FACE;
    }

    buildPixelGrid();
    buildSparks();
    buildFaceDataGrids();
    installTagEditor();
    installInputPlaceholders();
    createHologramLayer();
    appendBios("Awake body module loaded.", "log-blue");

    const preview = $("boot-preview-btn");
    if (preview) {
      preview.addEventListener("click", () => {
        appendBios("Previewing Awake body ceremony.", "log-amber");
        window.aida_arrive();
      });
    }
  });
})();
