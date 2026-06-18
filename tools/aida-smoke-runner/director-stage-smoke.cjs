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
    lastBeats: []
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
if (!elements.get("director-stage-image").src.endsWith("/Wary.png")) {
  throw new Error("Serana's wary portrait was not selected.");
}
if (runtime.director.activeCharacter !== "serana" || runtime.director.activeExpression !== "wary") {
  throw new Error("Director runtime state was not updated.");
}
if (!result.transcript.includes("PRINCESS SERANA: That door was not open before.")) {
  throw new Error("Session-safe transcript was not created.");
}

process.stdout.write(JSON.stringify({
  status: "pass",
  beats: result.beats.length,
  speakers: chat.map((item) => item.options.displayRole),
  stageImage: elements.get("director-stage-image").src,
  stageCaption: elements.get("director-stage-caption").textContent,
  transcript: result.transcript
}, null, 2));
