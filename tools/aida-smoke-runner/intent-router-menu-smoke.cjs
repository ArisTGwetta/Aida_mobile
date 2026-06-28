const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..", "..");
const intentPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "intent_router.js");
const sourcePath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "llm_openai.js");
const chat = [];
let captured = null;
let intentCallCount = 0;

const runtime = {
  boot: { driveLoaded: true, airlockCleared: true },
  context: {
    customTags: [],
    project: { project_name: "Bard and the Frozen Guide" },
    projectName: "project_briefcase_bard_and_the_frozen_guide.json"
  },
  mind: {
    activeProject: { project_name: "Bard and the Frozen Guide" },
    activeProjectName: "project_briefcase_bard_and_the_frozen_guide.json"
  },
  tokens: { llm: { provider: "openai", key: "test" } },
  session: { currentTurns: [] }
};

const document = {
  addEventListener(event, handler) {
    if (event === "DOMContentLoaded") handler();
  },
  getElementById() {
    return null;
  },
  createElement() {
    return {
      className: "",
      textContent: "",
      appendChild() {},
      querySelector() {
        return null;
      }
    };
  }
};

const window = {
  AIDA_RUNTIME: runtime,
  AIDA_CONFIG: {},
  AIDA_BODY: {
    appendChat(role, text, options = {}) {
      const line = { role, text, options };
      chat.push(line);
      return line;
    },
    pulse() {}
  },
  AIDA_LLM_PROVIDER: {
    readiness: () => ({ pass: true, provider: "openai", missing: [] }),
    callMessages: async (messages) => {
      const text = JSON.stringify(messages);
      if (text.includes("small intent router")) {
        intentCallCount += 1;
        return JSON.stringify({
          intent: "memory_note",
          action: "save_note",
          value: "Liora was promising, but not final",
          confidence: 0.95,
          reason: "User asked Aida to remember a project note.",
          requiresTool: true,
          requiresConfirmation: false
        });
      }
      throw new Error("Main LLM/composer should not be called for memory note.");
    },
    extractOutputText: () => ""
  },
  AIDA_SESSION_CAPTURE: {
    captureExchange(user, aida) {
      captured = {
        user,
        aida,
        customTags: runtime.context.customTags.slice()
      };
    }
  },
  AIDA_LLM_MESSAGES: {
    build: () => ({ blocked: true }),
    needsArchive: () => false
  },
  AIDA_LLM_SCOPE: {
    clearAccess() {},
    consumeAccess() {}
  }
};

const context = {
  window,
  document,
  console,
  CustomEvent: function CustomEvent(type, options) {
    this.type = type;
    this.detail = options?.detail;
  }
};
context.global = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(intentPath, "utf8"), context, { filename: intentPath });
vm.runInContext(fs.readFileSync(sourcePath, "utf8"), context, { filename: sourcePath });

(async () => {
  const phrase = "Let’s remember that Liora was promising, but not final.";
  const handled = await window.AIDA_CONVERSATION.sendText(phrase);
  if (!handled) throw new Error("Router memory note was not handled.");
  if (intentCallCount !== 1) throw new Error(`Unexpected intent calls: ${intentCallCount}`);
  if (!chat.some((line) => line.role === "AIDA" && /making a note/i.test(line.text))) {
    throw new Error(`Memory note acknowledgement missing: ${JSON.stringify(chat)}`);
  }
  if (!captured?.customTags?.includes("MEMORY") || !captured.customTags.includes("NOTE")) {
    throw new Error(`Memory note tags missing: ${JSON.stringify(captured)}`);
  }
  process.stdout.write(JSON.stringify({
    status: "pass",
    intent: runtime.context.lastIntentRoute?.intent,
    capturedTags: captured.customTags,
    aidaLines: chat.filter((line) => line.role === "AIDA").length
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
