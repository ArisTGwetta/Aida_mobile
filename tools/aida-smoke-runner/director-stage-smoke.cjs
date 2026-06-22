const fs = require("fs");
const path = require("path");
const vm = require("vm");

const elements = new Map();

function element(id = "") {
  const children = [];
  return {
    id,
    src: "",
    alt: "",
    textContent: "",
    dataset: {},
    className: "",
    children,
    classList: {
      values: new Set(),
      add(value) { this.values.add(value); },
      remove(value) { this.values.delete(value); },
      contains(value) { return this.values.has(value); }
    },
    append(...items) { children.push(...items); },
    appendChild(item) { children.push(item); },
    addEventListener() {},
    remove() { this.removed = true; },
    querySelector(selector) {
      if (selector === ".line-text") {
        return children.find((item) => item.className === "line-text") || null;
      }
      return null;
    }
  };
}

[
  "director-stage-frame",
  "director-stage-image",
  "director-stage-label",
  "director-stage-caption"
].forEach((id) => elements.set(id, element(id)));

const chat = [];
const runtime = {
  context: {
    projectName: "serana",
    projectMode: "briefcase",
    storyInputMode: {
      mode: "director",
      label: "DIRECTOR"
    }
  },
  director: {
    lastBeats: [],
    privateCharacters: {
      serana: {
        id: "serana",
        display_name: "Princess Serana",
        visibility: "private_drive",
        default_expression: "pensive",
        expressions: {
          coy: "aida_character_serana_coy.png",
          determined: "aida_character_serana_determined.png",
          exhausted: "aida_character_serana_exhausted.png",
          joyful: "aida_character_serana_joyful.png",
          pensive: "aida_character_serana_pensive.png",
          picaresque: "aida_character_serana_picaresque.png",
          postbattle: "aida_character_serana_postbattle.png",
          satisfied: "aida_character_serana_satisfied.png",
          wary: "aida_character_serana_wary.png"
        }
      }
    }
  }
};

const window = {
  AIDA_RUNTIME: runtime,
  AIDA_MODULES: {
    registry: {},
    register(module) {
      this.registry[module.id] = module;
    }
  },
  AIDA_BODY: {
    appendChat(role, text, options) {
      chat.push({ role, text, options });
    }
  },
  AIDA_DRIVE: {
    cachedBlobUrl(name) {
      return `blob:private-drive/${name}`;
    }
  },
  addEventListener() {},
  setTimeout(callback) {
    callback();
  }
};

const document = {
  readyState: "complete",
  getElementById(id) {
    return elements.get(id) || null;
  },
  addEventListener() {}
};

const context = {
  window,
  document,
  console,
  setTimeout: window.setTimeout
};
vm.createContext(context);

const sourcePath = path.resolve(__dirname, "../../AIDA_ONE_SPINE/spine/director_stage.js");
vm.runInContext(fs.readFileSync(sourcePath, "utf8"), context, {
  filename: sourcePath
});

const contract = window.AIDA_DIRECTOR.promptContract({
  rt: runtime,
  projectName: "serana"
});
if (!contract.includes("DIRECTOR STAGE CONTRACT")) {
  throw new Error("Narrative context did not receive the director contract.");
}
if (!contract.includes("CURRENT USER INPUT LANE: DIRECTOR")) {
  throw new Error("Selected story input lane was not included in the director contract.");
}

const pending = element("pending");
const packet = JSON.stringify({
  beats: [
    {
      speaker: "NARRATOR",
      display_name: "NARRATOR",
      text: "The torchlight catches on the old stone."
    },
    {
      speaker: "CHARACTER",
      display_name: "PRINCESS SERANA",
      text: "That door was not open before.",
      expression: "wary"
    },
    {
      speaker: "AIDA",
      display_name: "AIDA",
      text: "Francisco, I have a feeling she is right."
    }
  ],
  stage: {
    mode: "character",
    character: "serana",
    expression: "wary",
    caption: "Serana notices the changed doorway."
  }
});

const result = window.AIDA_DIRECTOR.present(packet, pending);
if (!result || result.beats.length !== 3) {
  throw new Error("Structured beats were not parsed.");
}
if (!pending.removed) {
  throw new Error("Pending Aida bubble was not removed.");
}
if (chat.map((item) => item.options.displayRole).join("|") !== "NARRATOR|PRINCESS SERANA|AIDA") {
  throw new Error("Speaker labels were not preserved.");
}
if (elements.get("director-stage-image").src !== "blob:private-drive/aida_character_serana_wary.png") {
  throw new Error("Serana's authenticated Drive portrait was not selected.");
}
if (runtime.director.activeCharacter !== "serana" || runtime.director.activeExpression !== "wary") {
  throw new Error("Director runtime state was not updated.");
}
if (!result.transcript.includes("PRINCESS SERANA: That door was not open before.")) {
  throw new Error("Session-safe transcript was not created.");
}

const heldImage = elements.get("director-stage-image").src;
window.AIDA_DIRECTOR.present(JSON.stringify({
  beats: [
    {
      speaker: "NARRATOR",
      display_name: "NARRATOR",
      text: "The corridor grows quiet."
    },
    {
      speaker: "AIDA",
      display_name: "AIDA",
      text: "I do not think she has relaxed yet."
    }
  ]
}));
if (elements.get("director-stage-image").src !== heldImage) {
  throw new Error("Narration or Aida commentary incorrectly replaced the held character image.");
}
const heldThroughNarration = elements.get("director-stage-image").src === heldImage;

delete runtime.director.privateCharacters.serana;
const privateUnavailableContract = window.AIDA_DIRECTOR.promptContract({
  rt: runtime,
  projectName: "serana"
});
if (privateUnavailableContract.includes("Available private-stage character: Princess Serana")) {
  throw new Error("Director advertised Serana without an authenticated private manifest.");
}
const fallback = window.AIDA_DIRECTOR.setStage({
  mode: "character",
  character: "serana",
  expression: "wary"
});
if (!fallback.privateUnavailable || fallback.mode !== "system") {
  throw new Error("Missing private character pack did not fall back to the system stage.");
}

process.stdout.write(JSON.stringify({
  status: "pass",
  beats: result.beats.length,
  speakers: chat.map((item) => item.options.displayRole),
  stageImage: elements.get("director-stage-image").src,
  heldThroughNarration,
  privateUnavailableFallback: fallback.mode,
  stageCaption: elements.get("director-stage-caption").textContent,
  transcript: result.transcript
}, null, 2));
