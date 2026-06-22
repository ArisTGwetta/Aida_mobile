(function () {
  const MODULE_ID = "spine.director.stage";
  const ASSET_ROOT = "body/assets/stage";
  const SERANA_MANIFEST = "character_pack_serana.json";

  const SERANA_EXPRESSIONS = {
    coy: "Coy.png",
    determined: "Determined.png",
    exhausted: "Exhausted.png",
    joyful: "Joyful.png",
    pensive: "Pensive.png",
    picaresque: "Picaresque.png",
    postbattle: "PostBattle.png",
    satisfied: "Satisfied.png",
    wary: "Wary.png"
  };

  const SYSTEM_EXPRESSIONS = {
    celebration: "Celebration.png",
    coy: "Coy.png",
    determined: "Determined.png",
    exhausted: "Exhausted.png",
    joyful: "Joyful.png",
    pensive: "Pensive.png",
    picaresque: "Picaresque.png",
    satisfied: "Satisfied.png",
    wary: "Wary.png"
  };

  const DEMO_STEPS = [
    {
      stage: {
        mode: "system",
        expression: "pensive",
        caption: "Aida holds a quiet thought beside the conversation."
      },
      beats: [
        {
          speaker: "AIDA",
          display_name: "AIDA",
          text: "This is my stage, Francisco. I can keep one thought visible while we talk."
        }
      ]
    },
    {
      stage: {
        mode: "character",
        character: "serana",
        expression: "wary",
        caption: "Serana notices something neither character has explained."
      },
      beats: [
        {
          speaker: "NARRATOR",
          display_name: "NARRATOR",
          text: "The old doorway stands open, though neither traveler remembers touching it."
        },
        {
          speaker: "CHARACTER",
          display_name: "PRINCESS SERANA",
          text: "That was closed when we arrived.",
          expression: "wary"
        },
        {
          speaker: "AIDA",
          display_name: "AIDA",
          text: "She is right. And I very much dislike doors that make decisions for themselves."
        }
      ]
    },
    {
      stage: {
        mode: "character",
        character: "serana",
        expression: "picaresque",
        caption: "Serana knows more than she is saying."
      },
      beats: [
        {
          speaker: "CHARACTER",
          display_name: "PRINCESS SERANA",
          text: "Me? Keeping secrets? You wound me."
        },
        {
          speaker: "AIDA",
          display_name: "AIDA",
          text: "Francisco, that face has never told the whole truth in its life."
        }
      ]
    },
    {
      stage: {
        mode: "system",
        expression: "coy",
        caption: "The camera grants the characters a little privacy."
      },
      beats: [
        {
          speaker: "NARRATOR",
          display_name: "NARRATOR",
          text: "The camera drifts toward the rain-silvered window, leaving the rest to warmth, shadows, and imagination."
        },
        {
          speaker: "AIDA",
          display_name: "AIDA",
          text: "Well. Those two clearly need the room."
        }
      ]
    },
    {
      stage: {
        mode: "system",
        expression: "celebration",
        caption: "Offline Director demonstration complete."
      },
      beats: [
        {
          speaker: "AIDA",
          display_name: "AIDA",
          text: "And there we are: character, narrator, co-author, and camera—each in the proper seat."
        }
      ]
    }
  ];

  let demoIndex = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function privateCharacters() {
    const rt = runtime();
    rt.director = rt.director || {};
    rt.director.privateCharacters = rt.director.privateCharacters || {};
    return rt.director.privateCharacters;
  }

  function seranaManifest() {
    return privateCharacters().serana || null;
  }

  async function hydratePrivateCharacters() {
    if (!runtime()?.tokens?.drive?.accessToken || !window.AIDA_DRIVE?.fetchJsonByName) return null;
    try {
      const manifest = await window.AIDA_DRIVE.fetchJsonByName(SERANA_MANIFEST, "director_private_character");
      if (!manifest?.expressions || manifest.id !== "serana") throw new Error("Serana manifest is malformed.");
      privateCharacters().serana = manifest;
      return manifest;
    } catch (error) {
      delete privateCharacters().serana;
      return null;
    }
  }

  function driveExpressionFile(expression) {
    const manifest = seranaManifest();
    return manifest?.expressions?.[expression] || manifest?.expressions?.pensive || null;
  }

  function cleanKey(value, fallback = "pensive") {
    return String(value || fallback)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function contextText(context = {}) {
    const rt = context.rt || runtime() || {};
    return [
      context.projectName,
      context.project?.name,
      context.project?.title,
      context.realm?.name,
      context.realm?.realm,
      context.role?.name,
      context.role?.role_name,
      rt.context?.projectName,
      rt.context?.projectMode
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function isNarrativeContext(context = {}) {
    return /\b(rpg|roleplay|role play|story|fiction|narrative|co.?narrator|serana)\b/.test(contextText(context));
  }

  function promptContract(context = {}) {
    if (!isNarrativeContext(context)) return "";
    const inputMode = context.rt?.context?.storyInputMode || runtime()?.context?.storyInputMode || {
      mode: "francisco",
      label: "FRANCISCO"
    };
    const contentRating = String(runtime()?.director?.contentRating || "R").toUpperCase();
    return [
      "",
      "DIRECTOR STAGE CONTRACT:",
      "Aida and Francisco are adult co-authors outside the fiction. Characters are fictional participants whose beliefs, emotions, dialogue, and choices do not automatically represent Aida or Francisco.",
      "Keep Aida's own perspective separate from character knowledge. Aida may disagree with, worry about, tease, or look away from what characters do while still narrating the story faithfully.",
      "Return ONLY one JSON object with this shape:",
      '{"beats":[{"speaker":"AIDA|NARRATOR|CHARACTER","display_name":"AIDA|NARRATOR|character name","text":"visible prose or dialogue","expression":"optional stage expression"}],"stage":{"mode":"character|system|clear","character":"serana or null","expression":"coy|determined|exhausted|joyful|pensive|picaresque|postbattle|satisfied|wary|celebration","caption":"short optional caption"}}',
      "Use AIDA when speaking directly to Francisco. Use NARRATOR for cinematic prose. Use CHARACTER with the character's display_name for in-fiction dialogue.",
      `CURRENT USER INPUT LANE: ${String(inputMode.label || inputMode.mode || "FRANCISCO").toUpperCase()}.`,
      `CURRENT STORY CAMERA RATING: ${contentRating}.`,
      "Interpret FRANCISCO as private co-author speech to Aida; NARRATOR as requested narrative prose; DIRECTOR as a meta instruction about pacing, camera, tone, or staging; ACTION as the player's in-fiction action; CHARACTER lanes as dialogue or intent belonging to the named player character.",
      "Camera-rating guide: G=gentle/platonic; PG=flirting, hand-holding, light peril; PG-13=kissing, sustained romantic tension, moderate violence; R=adult themes, strong tension or violence, and tasteful implied intimacy; NC-17=adult story-driven intimacy where the camera may remain emotionally present but should use discretion before graphic detail; X=explicit pornography without a storytelling purpose and is beyond this story camera.",
      "Do not cut away merely because a scene is romantic, affectionate, or approaching intimacy. At R, allow adult romantic development and implication. At NC-17, preserve character, emotion, consent, consequence, and narrative purpose while following the active provider's boundaries. For X-level depiction, decline or redirect briefly and keep the story moving through implication, aftermath, or a change of scene.",
      "When direct depiction should become discreet, do not scold, moralize, diagnose, or break the story. Use cinematic implication, a cutaway, fade, environmental detail, or an aftermath transition. Aida may make one brief warm co-author aside.",
      "STAGE CONTINUITY: hold the latest character/location image through Narrator and Aida beats. Do not switch back to a System jewel merely because the current beat is narration or Aida commentary. Change the stage only when a character expression materially changes, another subject/location is shown, or a deliberate cutaway/clear cue is needed.",
      "Do not confuse fictional tragedy, violence, flawed beliefs, or dramatic irony with real-world encouragement. If Francisco expresses genuine immediate real-world danger, respond to that directly instead of hiding it behind a cutaway.",
      seranaManifest()
        ? "Available private-stage character: Princess Serana. Available expressions: coy, determined, exhausted, joyful, pensive, picaresque, postbattle, satisfied, wary."
        : "No private character pack is currently loaded. Use System imagery until an authenticated character becomes available.",
      "System imagery supports non-character presentation with: celebration, coy, determined, exhausted, joyful, pensive, picaresque, satisfied, wary."
    ].join("\n");
  }

  function extractJson(text) {
    const raw = String(text || "").trim();
    if (!raw) return null;
    const unfenced = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(unfenced.slice(start, end + 1));
    } catch (_) {
      return null;
    }
  }

  function normalizedBeat(beat) {
    if (!beat || typeof beat !== "object") return null;
    const text = String(beat.text || "").trim();
    if (!text) return null;
    const speaker = String(beat.speaker || "AIDA").trim().toUpperCase();
    const styleRole = speaker === "NARRATOR" ? "NARRATOR" : speaker === "CHARACTER" ? "CHARACTER" : "AIDA";
    const displayRole = styleRole === "CHARACTER"
      ? String(beat.display_name || beat.character || "CHARACTER").trim()
      : styleRole;
    return {
      styleRole,
      displayRole,
      text,
      expression: cleanKey(beat.expression || "", "")
    };
  }

  function assetFor(cue = {}) {
    const mode = String(cue.mode || (cue.character ? "character" : "system")).toLowerCase();
    const expression = cleanKey(cue.expression);
    if (mode === "character" || cleanKey(cue.character, "") === "serana") {
      const fileName = driveExpressionFile(expression);
      const cachedUrl = fileName ? window.AIDA_DRIVE?.cachedBlobUrl?.(fileName) : null;
      if (!fileName) {
        return {
          mode: "system",
          character: null,
          expression: "pensive",
          src: `${ASSET_ROOT}/System/${SYSTEM_EXPRESSIONS.pensive}`,
          label: "AIDA'S STAGE",
          privateUnavailable: true
        };
      }
      return {
        mode: "character",
        character: "serana",
        expression: driveExpressionFile(expression) ? expression : "pensive",
        src: cachedUrl || `${ASSET_ROOT}/System/${SYSTEM_EXPRESSIONS.pensive}`,
        label: "PRINCESS SERANA",
        driveFile: fileName,
        privatePending: !cachedUrl
      };
    }
    return {
      mode: "system",
      character: null,
      expression: SYSTEM_EXPRESSIONS[expression] ? expression : "pensive",
      src: `${ASSET_ROOT}/System/${SYSTEM_EXPRESSIONS[expression] || SYSTEM_EXPRESSIONS.pensive}`,
      label: expression === "celebration" ? "CELEBRATION" : "AIDA'S STAGE"
    };
  }

  function setStage(cue = {}) {
    const rt = runtime();
    const frame = $("director-stage-frame");
    const image = $("director-stage-image");
    const label = $("director-stage-label");
    const caption = $("director-stage-caption");
    if (!image) return null;

    const asset = assetFor(cue);
    if (frame) frame.classList.add("changing");
    window.setTimeout(() => {
      image.src = asset.src;
      image.alt = asset.character
        ? `${asset.label}, ${asset.expression}`
        : `Aida presentation: ${asset.expression}`;
      if (label) label.textContent = String(cue.label || asset.label).toUpperCase();
      if (caption) {
        caption.textContent = String(cue.caption || (
          asset.character
            ? `${asset.label} - ${asset.expression}`
            : "Aida's visual thought-space."
        ));
      }
      if (frame) frame.classList.remove("changing");
    }, 170);

    if (rt?.director) {
      rt.director.stageMode = asset.mode;
      rt.director.activeCharacter = asset.character;
      rt.director.activeExpression = asset.expression;
      rt.director.lastCueAt = new Date().toISOString();
    }
    if (asset.privatePending && asset.driveFile && window.AIDA_DRIVE?.fetchBlobUrlByName) {
      const requestedAt = rt?.director?.lastCueAt;
      window.AIDA_DRIVE.fetchBlobUrlByName(asset.driveFile).then((url) => {
        if (!url || runtime()?.director?.lastCueAt !== requestedAt) return;
        image.src = url;
        image.alt = `${asset.label}, ${asset.expression}`;
      }).catch(() => {
        if (caption) caption.textContent = "Private character art is unavailable; Aida is holding the system stage.";
      });
    }
    return asset;
  }

  function transcriptFor(beats) {
    return beats.map((beat) => `${beat.displayRole}: ${beat.text}`).join("\n\n");
  }

  function present(rawReply, pendingLine = null) {
    const packet = extractJson(rawReply);
    const beats = Array.isArray(packet?.beats)
      ? packet.beats.map(normalizedBeat).filter(Boolean)
      : [];
    if (!beats.length) return null;

    if (pendingLine?.remove) pendingLine.remove();
    beats.forEach((beat) => {
      window.AIDA_BODY?.appendChat?.(beat.styleRole, beat.text, {
        displayRole: beat.displayRole,
        styleRole: beat.styleRole
      });
    });

    const hasExplicitStage = Boolean(packet.stage && typeof packet.stage === "object");
    const stageCue = hasExplicitStage ? { ...packet.stage } : {};
    const finalCharacterBeat = [...beats].reverse().find((beat) => beat.styleRole === "CHARACTER");
    if (!stageCue.expression && finalCharacterBeat?.expression) stageCue.expression = finalCharacterBeat.expression;
    if (!stageCue.mode && finalCharacterBeat) stageCue.mode = "character";
    const hasCharacterCue = Boolean(finalCharacterBeat?.expression);
    const shouldClear = String(stageCue.mode || "").toLowerCase() === "clear";
    if (shouldClear) {
      setStage({
        mode: "system",
        expression: stageCue.expression || "pensive",
        caption: stageCue.caption || "Aida's visual thought-space."
      });
    } else if (hasExplicitStage || hasCharacterCue) {
      setStage(stageCue);
    }

    const rt = runtime();
    if (rt?.director) rt.director.lastBeats = beats;
    return { packet, beats, transcript: transcriptFor(beats) };
  }

  function runDemo() {
    const preview = $("boot-preview-btn");
    const iface = $("aida-interface");
    if (!iface || getComputedStyle(iface).display === "none") preview?.click?.();

    const step = DEMO_STEPS[demoIndex % DEMO_STEPS.length];
    demoIndex += 1;
    const result = present(JSON.stringify(step));
    const button = $("director-demo-btn");
    if (button) button.textContent = `Offline Director ${demoIndex % DEMO_STEPS.length + 1}/${DEMO_STEPS.length}`;
    return result;
  }

  function inspect() {
    const summary = {
      narrative: isNarrativeContext(),
      state: runtime()?.director || null,
      seranaExpressions: Object.keys(SERANA_EXPRESSIONS),
      systemExpressions: Object.keys(SYSTEM_EXPRESSIONS)
    };
    console.log("AIDA_DIRECTOR_INSPECT", summary);
    return summary;
  }

  function install() {
    const demoButton = $("director-demo-btn");
    if (demoButton) demoButton.addEventListener("click", runDemo);
    const stageFrame = $("director-stage-frame");
    if (stageFrame) {
      stageFrame.addEventListener("click", runDemo);
      stageFrame.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          runDemo();
        }
      });
    }
    setStage({ mode: "system", expression: "pensive" });
    window.addEventListener("aida:drive-loaded", hydratePrivateCharacters);
    if (runtime()?.boot?.driveLoaded) hydratePrivateCharacters();
  }

  window.AIDA_DIRECTOR = {
    promptContract,
    isNarrativeContext,
    present,
    setStage,
    runDemo,
    inspect,
    hydratePrivateCharacters,
    assets: {
      serana: { source: "private_drive", manifest: SERANA_MANIFEST },
      system: { ...SYSTEM_EXPRESSIONS }
    }
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "presentation",
      reads: ["AIDA_RUNTIME.context", "structured LLM director packets"],
      writes: ["AIDA_RUNTIME.director", "director stage DOM", "labeled chat beats"],
      requires: ["AIDA_RUNTIME", "AIDA_BODY"],
      verifies: ["Aida, Narrator, and Character beats render separately while the stage expression remains independent from Aida's face"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
