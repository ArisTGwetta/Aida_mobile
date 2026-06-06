(function () {
  const MODULE_ID = "spine.emotion.engine";
  const ASSET_BASE = "body/assets/";
  const DEFAULT_FACE = "neutral1.png";
  const ROLE_DEFAULTS = {
    "co-narrator": "mischievous",
    co_narrator: "mischievous",
    "compliance-officer": "focused",
    compliance_officer: "focused",
    "protocol-unit": "focused",
    protocol_unit: "focused",
    chronicler: "calm",
    "oracle-voice": "calm",
    oracle_voice: "calm",
    "publishing-advisor": "happy",
    publishing_advisor: "happy",
    "architect-companion": "focused",
    architect_companion: "focused"
  };
  const REALM_DEFAULTS = {
    rpg: "mischievous",
    compliance: "focused",
    protocol_mx: "focused",
    chronicle: "calm",
    oracle: "calm",
    shirley_holmes: "happy",
    aida_architecture: "focused",
    ghost_in_the_house: "concerned"
  };

  function $(id) {
    return document.getElementById(id);
  }

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function log(message, className = "log-blue") {
    if (window.AIDA_BIOS?.log) {
      window.AIDA_BIOS.log(message, className);
      return;
    }
    if (window.AIDA_BODY?.pulse) window.AIDA_BODY.pulse(message);
  }

  function cleanKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\.json$/i, "")
      .replace(/^role_/, "")
      .replace(/^realm_/, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function valueName(value, fallback = "") {
    if (window.AIDA_PROJECTS?.valueName) return window.AIDA_PROJECTS.valueName(value, fallback);
    if (!value || typeof value !== "object") return fallback;
    return String(value.role_name || value.name || value.title || value.realm || value.id || fallback);
  }

  function fileExists(fileName) {
    if (!fileName) return false;
    const known = runtime()?.emotionEngine?.assetNames || null;
    if (!known) return true;
    return known.has(fileName.toLowerCase());
  }

  function faceMap() {
    const raw = runtime()?.drive?.files?.["face_map.json"] || {};
    return raw.faces || raw;
  }

  function coordinates() {
    const raw = runtime()?.drive?.files?.["emotion_coordinates.json"] || {};
    return raw.coordinates || raw.emotions || raw;
  }

  function emotionState() {
    const rt = runtime();
    return rt?.context?.emotion || rt?.mind?.emotion || {};
  }

  function flattenFaceEntry(entry) {
    if (!entry) return [];
    if (typeof entry === "string") return [entry];
    if (Array.isArray(entry)) return entry.flatMap(flattenFaceEntry);
    if (typeof entry !== "object") return [];
    return [
      entry.file,
      entry.filename,
      entry.face,
      entry.src,
      entry.default,
      entry.neutral,
      entry.image,
      entry.still,
      entry.primary
    ].filter(Boolean).flatMap(flattenFaceEntry);
  }

  function resolveFace(label) {
    const map = faceMap();
    const key = cleanKey(label || "neutral");
    const direct = map[label] || map[key] || map[key.replace(/_/g, "-")];
    const candidates = [
      ...flattenFaceEntry(direct),
      `${key}1.png`,
      `${key}.png`,
      DEFAULT_FACE
    ];

    for (const candidate of candidates) {
      const file = String(candidate || "").replace(/^body\/assets\//, "");
      if (fileExists(file)) return file;
    }

    return DEFAULT_FACE;
  }

  function nearestCoordinateLabel(valence, arousal) {
    const coords = coordinates();
    if (!coords || typeof coords !== "object") return null;

    let best = null;
    let bestDistance = Infinity;
    for (const [label, point] of Object.entries(coords)) {
      if (!point || typeof point !== "object") continue;
      const v = Number(point.valence ?? point.v);
      const a = Number(point.arousal ?? point.a);
      if (!Number.isFinite(v) || !Number.isFinite(a)) continue;
      const distance = ((v - valence) ** 2) + ((a - arousal) ** 2);
      if (distance < bestDistance) {
        best = label;
        bestDistance = distance;
      }
    }
    return best;
  }

  function currentLabel() {
    const state = emotionState();
    const explicit = state.label || state.emotion || state.state;
    if (explicit) return cleanKey(explicit);

    const valence = Number(state.valence ?? state.v);
    const arousal = Number(state.arousal ?? state.a);
    if (Number.isFinite(valence) && Number.isFinite(arousal)) {
      return cleanKey(nearestCoordinateLabel(valence, arousal) || "neutral");
    }

    return "neutral";
  }

  function defaultForContext() {
    const rt = runtime();
    const role = cleanKey(valueName(rt?.context?.role, ""));
    const realm = cleanKey(rt?.context?.projectName || valueName(rt?.context?.realm, ""));
    return ROLE_DEFAULTS[role] || REALM_DEFAULTS[realm] || null;
  }

  function writeState(label, source) {
    const rt = runtime();
    if (!rt) return null;

    const normalized = cleanKey(label || "neutral") || "neutral";
    const coords = coordinates();
    const point = coords[normalized] || coords[normalized.replace(/_/g, "-")] || {};
    const next = {
      ...(rt.context.emotion || rt.mind.emotion || {}),
      label: normalized,
      valence: point.valence ?? point.v ?? rt.context.emotion?.valence ?? rt.mind.emotion?.valence ?? 0,
      arousal: point.arousal ?? point.a ?? rt.context.emotion?.arousal ?? rt.mind.emotion?.arousal ?? 0,
      source: source || "emotion_engine"
    };

    rt.mind.emotion = next;
    rt.context.emotion = next;
    return next;
  }

  function apply(label, source = "explicit") {
    const rt = runtime();
    if (!rt) return null;

    const selected = label || currentLabel();
    const state = writeState(selected, source);
    const face = resolveFace(state?.label || selected);
    const src = `${ASSET_BASE}${face}`;

    if (window.AIDA_BODY?.setFace) window.AIDA_BODY.setFace(src);

    const engine = rt.emotionEngine;
    const previous = engine.currentLabel || null;
    engine.ready = true;
    engine.previousLabel = previous;
    engine.currentLabel = state.label;
    engine.currentFace = src;
    engine.currentSource = source;
    engine.lastAppliedAt = new Date().toISOString();
    engine.history.push({
      label: state.label,
      face,
      source,
      at: engine.lastAppliedAt
    });
    engine.history = engine.history.slice(-16);

    log(`EMOTION: ${state.label} applied face=${face} source=${source}.`, "log-blue");
    return state;
  }

  function applyCurrent(source = "drive_state") {
    return apply(currentLabel(), source);
  }

  function applyContextDefault(source = "context_default") {
    return apply(defaultForContext() || currentLabel(), source);
  }

  function afterExchange(userText, replyText) {
    const text = `${userText || ""}\n${replyText || ""}`.toLowerCase();
    let label = defaultForContext() || currentLabel();

    if (/\b(thank|thanks|great|awesome|love|happy|glad)\b/.test(text)) label = "happy";
    if (/\b(wonder|curious|question|mystery|clue)\b/.test(text)) label = "focused";
    if (/\b(confusing|concern|worry|stuck|hard)\b/.test(text)) label = "concerned";
    if (/\b(story|quest|bard|adventure|character)\b/.test(text)) label = "mischievous";

    return apply(label, "conversation_hint");
  }

  function inspect() {
    const rt = runtime();
    const engine = rt?.emotionEngine || {};
    const state = rt?.context?.emotion || rt?.mind?.emotion || {};
    const history = (engine.history || [])
      .slice(-5)
      .map((item) => `${item.label}/${item.face}/${item.source}`)
      .join(" | ") || "none";

    log("EMOTION: Safe summary follows.", "log-amber");
    log(`EMOTION STATE: label=${state.label || "unknown"}, valence=${state.valence ?? "n/a"}, arousal=${state.arousal ?? "n/a"}`);
    log(`EMOTION FACE: current=${engine.currentFace || "none"}, source=${engine.currentSource || "none"}`);
    log(`EMOTION HISTORY: ${history}`);
    return { state, engine };
  }

  function installAssetIndex() {
    const assets = [
      "angry.png", "calm1.png", "calm2.png", "concerned1.png", "concerned2.png",
      "excited1.png", "excited2.png", "exited1.png", "focused1.png", "focused2.png",
      "goodbye.png", "happy1.png", "happy2.png", "happy3.png", "happy4.png",
      "happy5.png", "hello-goobye.png", "hello.png", "inviting1.png", "inviting2.png",
      "Know_It_All.png", "lure1.png", "lure2.png", "mischievous1.png", "mischievous2.png",
      "mischievous3.png", "mischievous4.png", "neutral1.png", "neutral2.png",
      "pouting1.png", "pouting2.png", "pouting3.png", "pouting4.png", "sad1.png",
      "sad2.png", "sarcastic1.png", "sarcastic2.png", "sarcastic3.png", "standby.png",
      "stanby-rot1.png", "stanby-rot2.png", "stanby-rot3.png", "stanby-rot4.png",
      "stanby-rot5.png", "stanby-rot6.png", "surprised1.png", "surprised2.png",
      "surprised3.png", "trans_calm_to_happy.png", "trans_calm_to_neutral.png",
      "trans_concerned_to_focus.png", "trans_concerned_to_sad.png",
      "trans_exited_to_happy.png", "trans_exited_to_surprised.png",
      "trans_focus_to_concerned.png", "trans_focus_to_surprised.png", "trans_focus.png",
      "trans_happy_to_exited.png", "trans_neutral_to_calm.png",
      "trans_sad_to_concerned.png", "trans_sad_to_neutral.png",
      "trans_surprised_to_calm.png", "trans_surprised_to_exited.png",
      "trans_surprised_to_focus.png"
    ];
    const rt = runtime();
    if (rt?.emotionEngine) rt.emotionEngine.assetNames = new Set(assets.map((name) => name.toLowerCase()));
  }

  function install() {
    installAssetIndex();
    const inspectButton = $("emotion-inspect-btn");
    if (inspectButton) inspectButton.addEventListener("click", inspect);

    window.addEventListener("aida:project-context-changed", () => {
      applyContextDefault("project_context");
    });

    window.AIDA_EMOTIONS = {
      apply,
      applyCurrent,
      applyContextDefault,
      afterExchange,
      inspect,
      resolveFace
    };

    log("Emotion engine loaded. Waiting for Drive emotion map.", "log-blue");
  }

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "emotion_mapping",
      reads: ["AIDA_RUNTIME.context.emotion", "face_map.json", "emotion_coordinates.json"],
      writes: ["AIDA_RUNTIME.context.emotion", "AIDA_RUNTIME.body.currentFace"],
      requires: ["AIDA_RUNTIME", "AIDA_BODY"],
      verifies: ["emotion state maps to a body face without writing Drive memory"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
