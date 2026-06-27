const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..", "..");
const intentPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "intent_router.js");
const sourcePath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "llm_openai.js");
const chat = [];
let captured = null;
let searchedQuery = null;
let intentCallCount = 0;
let composerCallCount = 0;

const runtime = {
  boot: { driveLoaded: true, airlockCleared: true },
  context: { customTags: [] },
  tokens: { llm: { provider: "openai", key: "test" } },
  session: {
    currentTurns: [
      {
        user: { text: "I hear Taylor Swift is coming to town." },
        aida: { text: "That sounds worth checking. We can look up current tour dates and ticket prices if you want." },
        context: { project: "casual_chat", realm: "daily" },
        tags: { project: "casual_chat", realm: "daily" }
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
  AIDA_LLM_PROVIDER: {
    readiness: () => ({ pass: true, provider: "openai", missing: [] }),
    callMessages: async (messages) => {
      const text = JSON.stringify(messages);
      if (text.includes("small intent router")) {
        intentCallCount += 1;
        return JSON.stringify({
          intent: "web_search",
          query: "Taylor Swift tour dates and ticket prices near me",
          confidence: 0.93,
          reason: "User asked for dates and prices after discussing Taylor Swift coming to town.",
          requiresTool: true
        });
      }
      if (text.includes("composing a final reply")) {
        composerCallCount += 1;
        if (!text.includes("Taylor Swift tour dates and ticket prices near me")) {
          throw new Error("Composer did not receive the expanded tool query.");
        }
        if (!text.includes("A current space image worth sharing")) {
          throw new Error("Composer did not receive the tool result.");
        }
        return "I found a current sourced result for the Taylor Swift dates and prices search. I attached the source so you can open it on your phone.";
      }
      {
        throw new Error("Main LLM should not be called for explicit web search.");
      }
    },
    extractOutputText: () => "",
    async callWebSearch(query) {
      searchedQuery = query;
      return {
        text: "A current space image worth sharing: a new telescope release with a bright nebula.",
        sources: [{ url: "https://example.com/space-image", title: "Space image" }],
        provider: "openai",
        model: "web-search-test"
      };
    }
  },
  AIDA_SESSION_CAPTURE: {
    captureExchange(user, aida) {
      captured = { user, aida };
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
  const phrase = "please run a websearch for dates and prices";
  const handled = await window.AIDA_CONVERSATION.sendText(phrase);
  if (!handled) throw new Error("Explicit websearch phrase was not handled.");
  if (!searchedQuery || !/Taylor Swift/i.test(searchedQuery) || !/dates/i.test(searchedQuery) || !/prices/i.test(searchedQuery)) {
    throw new Error(`Unexpected web search query: ${searchedQuery}`);
  }
  if (chat.some((line) => /don'?t have browsing capability|cannot browse/i.test(line.text))) {
    throw new Error(`Conversation fell through to no-browsing response: ${JSON.stringify(chat)}`);
  }
  if (!chat.some((line) => line.role === "AIDA" && /current sourced result/i.test(line.text))) {
    throw new Error(`Composed web search result was not appended: ${JSON.stringify(chat)}`);
  }
  if (intentCallCount !== 1 || composerCallCount !== 1) {
    throw new Error(`Unexpected LLM routing calls: intent=${intentCallCount}, composer=${composerCallCount}`);
  }
  if (!captured?.aida?.includes("WEB SOURCES")) {
    throw new Error(`Web sources were not captured in the session log: ${JSON.stringify(captured)}`);
  }
  process.stdout.write(JSON.stringify({
    status: "pass",
    searchedQuery,
    intent: runtime.context.lastIntentRoute?.intent,
    intentCallCount,
    composerCallCount,
    aidaLines: chat.filter((line) => line.role === "AIDA").length
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
