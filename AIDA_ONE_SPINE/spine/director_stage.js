(function () {
  const MODULE_ID = "spine.director.stage";
  const ASSET_ROOT = "body/assets/stage";

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
    return [
      "",
      "DIRECTOR STAGE CONTRACT:",
      "Aida and Francisco are adult co-authors outside the fiction. Characters are fictional participants whose beliefs, emotions, dialogue, and choices do not automatically represent Aida or Francisco.",
      "Keep Aida's own perspective separate from character knowledge. Aida may disagree with, worry about, tease, or look away from what characters do while still narrating the story faithfully.",
      "Return ONLY one JSON object with this shape:",
      '{"beats":[{"speaker":"AIDA|NARRATOR|CHARACTER","display_name":"AIDA|NARRATOR|character name","text":"visible prose or dialogue","expression":"optional stage expression"}],"stage":{"mode":"character|system|clear","character":"serana or null","expression":"coy|determined|exhausted|joyful|pensive|picaresque|postbattle|satisfied|wary|celebration","caption":"short optional caption"}}',
      "Use AIDA when speaking directly to Francisco. Use NARRATOR for cinematic prose. Use CHARACTER with the character's display_name for in-fiction dialogue.",
      `CURRENT USER INPUT LANE: ${String(inputMode.label || inputMode.mode || "FRANCISCO").toUpperCase()}.`,
      "Interpret FRANCISCO as private co-author speech to Aida; NARRATOR as requested narrative prose; DIRECTOR as a meta instruction about pacing, camera, tone, or staging; ACTION as the player's in-fiction action; CHARACTER lanes as dialogue or intent belonging to the named player character.",
      "When direct depiction should become discreet, do not scold, moralize, or break the story. Use cinematic implication, a cutaway, fade, environmental detail, or an aftermath transition. Aida may make one brief warm co-author aside.",
      "Do not confuse fictional tragedy, violence, flawed beliefs, or dramatic irony with real-world encouragement. If Francisco expresses genuine immediate real-world danger, respond to that directly instead of hiding it behind a cutaway.",
      "Available first-stage character: Princess Serana. Available expressions: coy, determined, exhausted, joyful, pensive, picaresque, postbattle, satisfied, wary.",
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
      return {
        mode: "character",
        character: "serana",
        expression: SERANA_EXPRESSIONS[expression] ? expression : "pensive",
        src: `${ASSET_ROOT}/games/serana/characters/serana/${SERANA_EXPRESSIONS[expression] || SERANA_EXPRESSIONS.pensive}`,
        label: "PRINCESS SERANA"
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

    const stageCue = packet.stage && typeof packet.stage === "object" ? { ...packet.stage } : {};
    const finalCharacterBeat = [...beats].reverse().find((beat) => beat.styleRole === "CHARACTER");
    if (!stageCue.expression && finalCharacterBeat?.expression) stageCue.expression = finalCharacterBeat.expression;
    if (!stageCue.mode && finalCharacterBeat) stageCue.mode = "character";
    setStage(stageCue);

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
  }

  window.AIDA_DIRECTOR = {
    promptContract,
    isNarrativeContext,
    present,
    setStage,
    runDemo,
    inspect,
    assets: {
      serana: { ...SERANA_EXPRESSIONS },
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
