const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..", "..");
const sourcePath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "llm_openai.js");
const chat = [];
let captured = null;
let searchedQuery = null;
let composerCallCount = 0;

const runtime = {
  boot: { driveLoaded: true, airlockCleared: true },
  context: {
    customTags: [],
    projectName: "project_briefcase_bard_and_the_frozen_guide.json"
  },
  mind: {
    activeProjectName: "project_briefcase_bard_and_the_frozen_guide.json",
    activeProject: { project_name: "Bard and the Frozen Guide" }
  },
  tokens: { llm: { provider: "openai", key: "test" } },
  session: {
    currentTurns: [
      {
        user: { text: "Yes, let’s keep playing ... so did we get a favorite name" },
        aida: { text: "We discussed name ideas for the bard's ethereal companion, but I should search memory for the actual candidates." }
      }
    ]
  }
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
      const line = {
        role,
        text,
        options,
        removed: false,
        remove() {
          this.removed = true;
        }
      };
      chat.push(line);
      return line;
    },
    pulse() {}
  },
  AIDA_INTENT_ROUTER: {
    infer: async () => ({ intent: "none", query: "", confidence: 0.2, autoRun: false }),
    composeToolReply: async (payload) => {
      composerCallCount += 1;
      if (!JSON.stringify(payload).includes("Liora")) {
        throw new Error("Composer did not receive memory hits.");
      }
      return "I found the earlier thread: Liora and Elaren were the strongest candidate names.";
    }
  },
  AIDA_CRAWLER: {
    indexNow() {},
    search(query) {
      searchedQuery = query;
      return {
        searchedAt: "2026-06-28T00:00:00.000Z",
        results: [
          {
            title: "Bard companion naming",
            text: "The promising names were Liora and Elaren, with Liora feeling closest.",
            project: "Bard and the Frozen Guide",
            sourceRefs: ["raw_turn_12"],
            score: 14
          }
        ]
      };
    }
  },
  AIDA_SESSION_CAPTURE: {
    captureExchange(user, aida) {
      captured = { user, aida };
    }
  },
  AIDA_LLM_PROVIDER: {
    readiness: () => ({ pass: true, provider: "openai", missing: [] }),
    callMessages: async () => {
      throw new Error("Main LLM should not be called for explicit memory recall.");
    },
    extractOutputText: () => ""
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
vm.runInContext(fs.readFileSync(sourcePath, "utf8"), context, { filename: sourcePath });

(async () => {
  const phrase = "Please find the names we mentioned before...";
  const handled = await window.AIDA_CONVERSATION.sendText(phrase);
  if (!handled) throw new Error("Explicit memory recall phrase was not handled.");
  if (!searchedQuery || !/names/i.test(searchedQuery) || !/bard/i.test(searchedQuery)) {
    throw new Error(`Unexpected memory search query: ${searchedQuery}`);
  }
  if (!chat.some((line) => line.role === "AIDA" && /Liora/i.test(line.text))) {
    throw new Error(`Memory result was not appended: ${JSON.stringify(chat)}`);
  }
  if (composerCallCount !== 1) {
    throw new Error(`Unexpected composer count: ${composerCallCount}`);
  }
  if (!captured?.aida?.includes("Liora")) {
    throw new Error(`Memory answer was not captured: ${JSON.stringify(captured)}`);
  }
  process.stdout.write(JSON.stringify({
    status: "pass",
    searchedQuery,
    composerCallCount,
    aidaLines: chat.filter((line) => line.role === "AIDA").length
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
