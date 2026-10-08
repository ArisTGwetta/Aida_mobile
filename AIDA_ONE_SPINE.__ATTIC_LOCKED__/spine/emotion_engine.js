// AIDA REVIEW BLOCK 1: File header - AIDA_ONE_SPINE\spine\emotion_engine.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
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
    "architect-companion": "happy",
    architect_companion: "happy"
  };
  const REALM_DEFAULTS = {
    rpg: "mischievous",
    compliance: "focused",
    protocol_mx: "focused",
    chronicle: "calm",
    oracle: "calm",
    shirley_holmes: "happy",
    aida_architecture: "happy",
    ghost_in_the_house: "concerned"
  };

// AIDA REVIEW BLOCK 3: Function $ - callable behavior in this runtime organ.
  function $(id) {
    return document.getElementById(id);
  }

// AIDA REVIEW BLOCK 4: Function runtime - callable behavior in this runtime organ.
  function runtime() {
    return window.AIDA_RUNTIME;
  }

// AIDA REVIEW BLOCK 5: Function log - callable behavior in this runtime organ.
  function log(message, className = "log-blue") {
    if (window.AIDA_BIOS?.log) {
      window.AIDA_BIOS.log(message, className);
      return;
    }
    if (window.AIDA_BODY?.pulse) window.AIDA_BODY.pulse(message);
  }

// AIDA REVIEW BLOCK 6: Function cleanKey - callable behavior in this runtime organ.
  function cleanKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\.json$/i, "")
      .replace(/^role_/, "")
      .replace(/^realm_/, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

// AIDA REVIEW BLOCK 7: Function clamp - callable behavior in this runtime organ.
  function clamp(value, min = -1, max = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(min, Math.min(max, number));
  }

// AIDA REVIEW BLOCK 8: Function round - callable behavior in this runtime organ.
  function round(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 1000) / 1000 : null;
  }

// AIDA REVIEW BLOCK 9: Function valueName - callable behavior in this runtime organ.
  function valueName(value, fallback = "") {
    if (window.AIDA_PROJECTS?.valueName) return window.AIDA_PROJECTS.valueName(value, fallback);
    if (!value || typeof value !== "object") return fallback;
    return String(value.role_name || value.name || value.title || value.realm || value.id || fallback);
  }

// AIDA REVIEW BLOCK 10: Function fileExists - callable behavior in this runtime organ.
  function fileExists(fileName) {
    if (!fileName) return false;
    const known = runtime()?.emotionEngine?.assetNames || null;
    if (!known) return true;
    return known.has(fileName.toLowerCase());
  }

// AIDA REVIEW BLOCK 11: Function faceMap - callable behavior in this runtime organ.
  function faceMap() {
    const raw = runtime()?.drive?.files?.["face_map.json"] || {};
    return raw.faces || raw;
  }

// AIDA REVIEW BLOCK 12: Function coordinates - callable behavior in this runtime organ.
  function coordinates() {
    const raw = runtime()?.drive?.files?.["emotion_coordinates.json"] || {};
    return raw.coordinates || raw.emotions || raw;
  }

// AIDA REVIEW BLOCK 13: Function emotionState - callable behavior in this runtime organ.
  function emotionState() {
    const rt = runtime();
    return rt?.context?.emotion || rt?.mind?.emotion || {};
  }

// AIDA REVIEW BLOCK 14: Function coordinatePoint - callable behavior in this runtime organ.
  function coordinatePoint(label) {
    const key = cleanKey(label);
    const coords = coordinates();
    const point = coords[key] || coords[key.replace(/_/g, "-")] || null;
    if (!point || typeof point !== "object") return null;
    return {
      valence: clamp(point.valence ?? point.v),
      arousal: clamp(point.arousal ?? point.a)
    };
  }

// AIDA REVIEW BLOCK 15: Function statePoint - callable behavior in this runtime organ.
  function statePoint(fallbackLabel = "neutral") {
    const state = emotionState();
    const explicitPoint = coordinatePoint(state.label || state.emotion || state.state);
    const valence = Number(state.valence ?? state.v);
    const arousal = Number(state.arousal ?? state.a);

    if (Number.isFinite(valence) && Number.isFinite(arousal)) {
      return { valence: clamp(valence), arousal: clamp(arousal) };
    }

    return explicitPoint || coordinatePoint(fallbackLabel) || { valence: 0.1, arousal: -0.1 };
  }

// AIDA REVIEW BLOCK 16: Function flattenFaceEntry - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 17: Function faceCandidates - callable behavior in this runtime organ.
  function faceCandidates(label) {
    const map = faceMap();
    const key = cleanKey(label || "neutral");
    const direct = map[label] || map[key] || map[key.replace(/_/g, "-")];
    return [
      ...flattenFaceEntry(direct),
      `${key}1.png`,
      `${key}.png`,
      DEFAULT_FACE
    ];
  }

// AIDA REVIEW BLOCK 18: Function resolveFace - callable behavior in this runtime organ.
  function resolveFace(label) {
    for (const candidate of faceCandidates(label)) {
      const file = String(candidate || "").replace(/^body\/assets\//, "");
      if (fileExists(file)) return {
        file,
        fallback: file === DEFAULT_FACE && cleanKey(label) !== "neutral",
        missing: false
      };
    }

    return { file: DEFAULT_FACE, fallback: true, missing: true };
  }

// AIDA REVIEW BLOCK 19: Function rankedCoordinates - callable behavior in this runtime organ.
  function rankedCoordinates(valence, arousal) {
    const coords = coordinates();
    if (!coords || typeof coords !== "object") return [];

    return Object.entries(coords)
      .map(([label, point]) => {
        if (!point || typeof point !== "object") return null;
        const v = Number(point.valence ?? point.v);
        const a = Number(point.arousal ?? point.a);
        if (!Number.isFinite(v) || !Number.isFinite(a)) return null;
        return {
          label: cleanKey(label),
          valence: clamp(v),
          arousal: clamp(a),
          distance: Math.sqrt(((v - valence) ** 2) + ((a - arousal) ** 2))
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);
  }

// AIDA REVIEW BLOCK 20: Function resolveEmotionTarget - callable behavior in this runtime organ.
  function resolveEmotionTarget(target, source = "explicit") {
    const rt = runtime();
    const thresholds = rt?.emotionEngine?.thresholds || {};
    const weakSnapDistance = thresholds.weakSnapDistance ?? 0.38;
    const ambiguousMargin = thresholds.ambiguousMargin ?? 0.12;

    const input = typeof target === "object" && target !== null ? target : { label: target };
    const requestedLabel = cleanKey(input.label || input.emotion || input.state || "");
    const desired = input.desired || input.wish || null;
    const basePoint = requestedLabel ? coordinatePoint(requestedLabel) || statePoint() : statePoint();
    const valence = Number.isFinite(Number(input.valence ?? input.v))
      ? clamp(input.valence ?? input.v)
      : basePoint.valence;
    const arousal = Number.isFinite(Number(input.arousal ?? input.a))
      ? clamp(input.arousal ?? input.a)
      : basePoint.arousal;

    const ranked = rankedCoordinates(valence, arousal);
    const best = requestedLabel && coordinatePoint(requestedLabel)
      ? {
          label: requestedLabel,
          ...coordinatePoint(requestedLabel),
          distance: Math.sqrt(((coordinatePoint(requestedLabel).valence - valence) ** 2) + ((coordinatePoint(requestedLabel).arousal - arousal) ** 2))
        }
      : ranked[0] || { label: requestedLabel || "neutral", valence, arousal, distance: 0 };
    const runnerUp = ranked.find((item) => item.label !== best.label) || null;
    const margin = runnerUp ? runnerUp.distance - best.distance : null;
    const ambiguous = margin !== null && margin <= ambiguousMargin;
    const weak = best.distance >= weakSnapDistance;
    const snapStrength = weak ? "weak" : ambiguous ? "ambiguous" : "strong";

    return {
      label: best.label,
      requestedLabel: requestedLabel || null,
      desired,
      source,
      target: { valence: round(valence), arousal: round(arousal) },
      resolved: {
        label: best.label,
        valence: round(best.valence),
        arousal: round(best.arousal)
      },
      distance: round(best.distance),
      runnerUp: runnerUp ? {
        label: runnerUp.label,
        distance: round(runnerUp.distance),
        valence: round(runnerUp.valence),
        arousal: round(runnerUp.arousal)
      } : null,
      margin: round(margin),
      weak,
      ambiguous,
      snapStrength
    };
  }

// AIDA REVIEW BLOCK 21: Function currentLabel - callable behavior in this runtime organ.
  function currentLabel() {
    const state = emotionState();
    const explicit = state.label || state.emotion || state.state;
    if (explicit) return cleanKey(explicit);
    const point = statePoint();
    return resolveEmotionTarget(point, "current_state").label;
  }

// AIDA REVIEW BLOCK 22: Function defaultForContext - callable behavior in this runtime organ.
  function defaultForContext() {
    const rt = runtime();
    const role = cleanKey(valueName(rt?.context?.role, ""));
    const realm = cleanKey(rt?.context?.projectName || valueName(rt?.context?.realm, ""));
    return REALM_DEFAULTS[realm] || ROLE_DEFAULTS[role] || null;
  }

// AIDA REVIEW BLOCK 23: Function wishlistName - callable behavior in this runtime organ.
  function wishlistName(snap) {
    if (snap.desired) return cleanKey(snap.desired);
    if (snap.ambiguous && snap.runnerUp) return `${snap.label}_${snap.runnerUp.label}_blend`;
    if (snap.weak) return `${snap.label}_between_face`;
    return null;
  }

// AIDA REVIEW BLOCK 24: Function recordSnap - callable behavior in this runtime organ.
  function recordSnap(snap, face) {
    const rt = runtime();
    if (!rt?.emotionEngine) return;
    const entry = {
      at: new Date().toISOString(),
      source: snap.source,
      requested: snap.requestedLabel,
      desired: snap.desired || null,
      target: snap.target,
      resolved: snap.resolved,
      face: face.file,
      fallbackFace: Boolean(face.fallback || face.missing),
      distance: snap.distance,
      runnerUp: snap.runnerUp,
      margin: snap.margin,
      snapStrength: snap.snapStrength,
      weak: snap.weak,
      ambiguous: snap.ambiguous
    };

    rt.emotionEngine.snapLog.push(entry);
    rt.emotionEngine.snapLog = rt.emotionEngine.snapLog.slice(-48);

    if (entry.weak || entry.ambiguous || entry.fallbackFace || entry.desired) {
      const name = wishlistName(snap);
      if (name) {
        const existing = rt.emotionEngine.faceWishlist.find((item) => item.name === name);
        if (existing) {
          existing.count += 1;
          existing.lastSeen = entry.at;
          existing.lastSnap = entry;
        } else {
          rt.emotionEngine.faceWishlist.push({
            name,
            reason: entry.fallbackFace
              ? "missing_face_asset"
              : entry.desired
                ? "desired_expression_gap"
                : entry.weak
                  ? "weak_coordinate_snap"
                  : "ambiguous_coordinate_snap",
            count: 1,
            firstSeen: entry.at,
            lastSeen: entry.at,
            lastSnap: entry
          });
        }
      }
    }
  }

// AIDA REVIEW BLOCK 25: Function writeState - callable behavior in this runtime organ.
  function writeState(snap, source) {
    const rt = runtime();
    if (!rt) return null;

    const point = coordinatePoint(snap.label) || snap.resolved || snap.target || {};
    const next = {
      ...(rt.context.emotion || rt.mind.emotion || {}),
      label: snap.label,
      valence: point.valence ?? 0,
      arousal: point.arousal ?? 0,
      source: source || "emotion_engine",
      snap: {
        target: snap.target,
        distance: snap.distance,
        runnerUp: snap.runnerUp,
        margin: snap.margin,
        strength: snap.snapStrength
      }
    };

    rt.mind.emotion = next;
    rt.context.emotion = next;
    return next;
  }

// AIDA REVIEW BLOCK 26: Function apply - callable behavior in this runtime organ.
  function apply(target, source = "explicit") {
    const rt = runtime();
    if (!rt) return null;

    const snap = resolveEmotionTarget(target || currentLabel(), source);
    const state = writeState(snap, source);
    const face = resolveFace(state?.label || snap.label);
    const src = `${ASSET_BASE}${face.file}`;

    if (window.AIDA_BODY?.setFace) window.AIDA_BODY.setFace(src);

    const engine = rt.emotionEngine;
    const previous = engine.currentLabel || null;
    engine.ready = true;
    engine.previousLabel = previous;
    engine.currentLabel = state.label;
    engine.currentFace = src;
    engine.currentSource = source;
    engine.lastAppliedAt = new Date().toISOString();
    engine.lastSnap = snap;
    engine.history.push({
      label: state.label,
      face: face.file,
      source,
      snapStrength: snap.snapStrength,
      distance: snap.distance,
      at: engine.lastAppliedAt
    });
    engine.history = engine.history.slice(-16);
    recordSnap(snap, face);

    log(
      `EMOTION: ${state.label} applied face=${face.file} source=${source} snap=${snap.snapStrength} distance=${snap.distance}.`,
      "log-blue"
    );
    if (snap.weak || snap.ambiguous || face.fallback) {
      const runner = snap.runnerUp ? ` runnerUp=${snap.runnerUp.label}/${snap.runnerUp.distance}` : "";
      log(`EMOTION SNAP: ${snap.snapStrength} target=(${snap.target.valence},${snap.target.arousal})${runner}.`, "log-amber");
    }
    return state;
  }

// AIDA REVIEW BLOCK 27: Function applyCurrent - callable behavior in this runtime organ.
  function applyCurrent(source = "drive_state") {
    const state = emotionState();
    return apply({
      label: state.label || state.emotion || state.state || "neutral",
      valence: state.valence ?? state.v,
      arousal: state.arousal ?? state.a
    }, source);
  }

// AIDA REVIEW BLOCK 28: Function applyContextDefault - callable behavior in this runtime organ.
  function applyContextDefault(source = "context_default") {
    return apply(defaultForContext() || currentLabel(), source);
  }

// AIDA REVIEW BLOCK 29: Function conversationTarget - callable behavior in this runtime organ.
  function conversationTarget(userText, replyText) {
    const text = `${userText || ""}\n${replyText || ""}`.toLowerCase();
    let baseLabel = defaultForContext() || currentLabel();
    let point = coordinatePoint(baseLabel) || statePoint(baseLabel);
    let valence = point.valence;
    let arousal = point.arousal;
    let desired = null;

    if (/\b(thank|thanks|great|awesome|love|happy|glad|sweet)\b/.test(text)) {
      valence += 0.28;
      arousal -= 0.05;
      desired = desired || "warm_appreciative";
    }
    if (/\b(wonder|curious|question|mystery|clue|investigate)\b/.test(text)) {
      valence += 0.12;
      arousal += 0.2;
      desired = desired || "curious";
    }
    if (/\b(confusing|concern|worry|stuck|hard|uncertain)\b/.test(text)) {
      valence -= 0.25;
      arousal += 0.18;
      desired = desired || "concerned_but_present";
    }
    if (/\b(story|quest|bard|adventure|character|rpg)\b/.test(text)) {
      valence += 0.18;
      arousal += 0.22;
      desired = desired || "playful_story";
    }
    if (/\b(disgust|disgusted|gross|repuls|biology experiment|specimen|rot|mold)\b/.test(text)) {
      valence -= 0.48;
      arousal += 0.22;
      desired = "disgusted_but_curious";
    }
    if (/\b(disdain|contempt|beneath|scoff)\b/.test(text)) {
      valence -= 0.36;
      arousal += 0.12;
      desired = "disdain";
    }

    return {
      valence: clamp(valence),
      arousal: clamp(arousal),
      desired
    };
  }

// AIDA REVIEW BLOCK 30: Function afterExchange - callable behavior in this runtime organ.
  function afterExchange(userText, replyText) {
    return apply(conversationTarget(userText, replyText), "conversation_hint");
  }

// AIDA REVIEW BLOCK 31: Function inspect - callable behavior in this runtime organ.
  function inspect() {
    const rt = runtime();
    const engine = rt?.emotionEngine || {};
    const state = rt?.context?.emotion || rt?.mind?.emotion || {};
// AIDA REVIEW BLOCK 32: Function history - arrow-function behavior in this runtime organ.
    const history = (engine.history || [])
      .slice(-5)
      .map((item) => `${item.label}/${item.face}/${item.source}/${item.snapStrength || "n/a"}`)
      .join(" | ") || "none";
// AIDA REVIEW BLOCK 33: Function snaps - arrow-function behavior in this runtime organ.
    const snaps = (engine.snapLog || [])
      .slice(-3)
      .map((item) => `${item.resolved.label}:d=${item.distance},${item.snapStrength}`)
      .join(" | ") || "none";
// AIDA REVIEW BLOCK 34: Function wishlist - arrow-function behavior in this runtime organ.
    const wishlist = (engine.faceWishlist || [])
      .slice(-5)
      .map((item) => `${item.name}(${item.count})`)
      .join(" | ") || "none";

    log("EMOTION: Safe summary follows.", "log-amber");
    log(`EMOTION STATE: label=${state.label || "unknown"}, valence=${state.valence ?? "n/a"}, arousal=${state.arousal ?? "n/a"}`);
    log(`EMOTION FACE: current=${engine.currentFace || "none"}, source=${engine.currentSource || "none"}`);
    log(`EMOTION SNAP TRAIL: ${snaps}`);
    log(`EMOTION FACE WISHLIST: ${wishlist}`);
    log(`EMOTION HISTORY: ${history}`);
    return { state, engine };
  }

// AIDA REVIEW BLOCK 35: Function installAssetIndex - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 36: Function install - callable behavior in this runtime organ.
  function install() {
    installAssetIndex();
    const inspectButton = $("emotion-inspect-btn");
    if (inspectButton) inspectButton.addEventListener("click", inspect);

    window.addEventListener("aida:project-context-changed", () => {
      applyContextDefault("project_context");
    });

// AIDA REVIEW BLOCK 37: Browser export AIDA_EMOTIONS - exposes this organ to the page runtime.
    window.AIDA_EMOTIONS = {
      apply,
      applyCurrent,
      applyContextDefault,
      afterExchange,
      inspect,
      resolveFace,
      resolveEmotionTarget
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
      verifies: ["emotion state maps to a body face and records snap strength without writing Drive memory"]
    });
  }

// AIDA REVIEW BLOCK 38: Browser event wiring - connects page lifecycle or user actions to this organ.
  document.addEventListener("DOMContentLoaded", install);
})();
