#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const scopePath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "llm_scope.js");
const crawlerPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "crawler.js");
const capturePath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "session_capture.js");
const awayPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "while_away.js");

function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

function install(provider = "openai") {
  const badge = { textContent: "", dataset: {}, hidden: true };
  const runtime = {
    boot: { driveLoaded: true },
    tokens: {
      llm: {
        provider,
        profile: provider === "ollama" ? "private-local" : "normal",
        model: provider === "ollama" ? "llama3:latest" : provider === "xai" ? "grok-4.3" : "gpt-4.1-mini"
      }
    },
    context: {
      identity: { name: "Aida" },
      realm: { name: "AIDA_ARCHITECTURE" },
      role: { name: "architect_companion" },
      emotion: { label: "focused" },
      lastLlmResponse: null
    },
    mind: {
      identity: { name: "Aida" },
      realm: { name: "AIDA_ARCHITECTURE" },
      role: { name: "architect_companion" },
      memory: {},
      insights: {}
    },
    drive: { files: {} },
    sleep: { pendingJournal: [], packets: [] },
    session: null,
    crawler: { entries: [], searches: [] },
    emotionEngine: { faceWishlist: [] }
  };
  global.document = {
    readyState: "complete",
    documentElement: { dataset: {} },
    addEventListener() {},
    getElementById: (id) => id === "llm-route-badge" ? badge : null
  };
  global.window = {
    localStorage: storage(),
    AIDA_RUNTIME: runtime,
    AIDA_LLM_PROVIDER: {
      normalizeProvider: (value) => value === "grok" ? "xai" : String(value || "").toLowerCase(),
      currentInfo: () => ({
        provider: runtime.tokens.llm.provider,
        model: runtime.tokens.llm.model
      })
    },
    AIDA_MODULES: { register() {} },
    addEventListener() {},
    AIDA_BIOS: { log() {} },
    AIDA_BODY: { pulse() {}, appendChat() {} }
  };
  Function(fs.readFileSync(scopePath, "utf8"))();
  Function(fs.readFileSync(crawlerPath, "utf8"))();
  Function(fs.readFileSync(capturePath, "utf8"))();
  Function(fs.readFileSync(awayPath, "utf8"))();
  return { runtime, badge };
}

function main() {
  const startedAt = new Date().toISOString();
  try {
    const { runtime, badge } = install("openai");

    runtime.crawler.entries = [
      { id: "shared", type: "drive_fact", title: "Shared fact", text: "shared comet memory", tokens: ["shared", "comet", "memory"], llmScope: "shared" },
      { id: "openai", type: "raw_turn_user", title: "OpenAI turn", text: "openai comet memory", tokens: ["openai", "comet", "memory"], llmProvider: "openai", llmScope: "openai" },
      { id: "xai", type: "raw_turn_user", title: "Grok turn", text: "grok comet memory", tokens: ["grok", "comet", "memory"], llmProvider: "xai", llmScope: "xai" },
      { id: "ollama", type: "raw_turn_user", title: "Local turn", text: "ollama comet memory", tokens: ["ollama", "comet", "memory"], llmProvider: "ollama", llmScope: "ollama" }
    ];

    const openaiResults = window.AIDA_CRAWLER.search("comet memory", { minScore: 1, limit: 10 }).results;
    assert(openaiResults.some((item) => item.id === "shared"), "OpenAI could not see shared core memory.");
    assert(openaiResults.some((item) => item.id === "openai"), "OpenAI could not see its own memory.");
    assert(!openaiResults.some((item) => item.id === "xai" || item.id === "ollama"), "OpenAI saw another LLM's memory.", openaiResults);

    window.AIDA_SESSION_CAPTURE.captureExchange("Scope test", "Captured.");
    const captured = runtime.session.currentTurns[0];
    assert(captured.tags.llm_provider === "openai", "Captured exchange lacks OpenAI provider tag.", captured.tags);

    runtime.tokens.llm = { provider: "xai", profile: "grok-roleplay", model: "grok-4.3" };
    window.AIDA_LLM_SCOPE.applyVisuals();
    const grokResults = window.AIDA_CRAWLER.search("comet memory", { minScore: 1, limit: 10 }).results;
    assert(grokResults.some((item) => item.id === "shared" && item.llmScope === "shared"), "Grok could not see shared memory.");
    assert(grokResults.some((item) => item.id === "xai"), "Grok could not see its own memory.");
    assert(!grokResults.some((item) => item.id === "openai" || item.id === "ollama"), "Grok saw another LLM's memory.", grokResults);
    assert(document.documentElement.dataset.llmProvider === "xai", "Provider visual state did not switch to xAI.");
    assert(badge.textContent === "GROK · HOSTED", "Provider badge did not identify Grok.", badge);

    window.AIDA_LLM_SCOPE.authorizeOnce("all", "smoke_cross_llm_meditation");
    const allResults = window.AIDA_CRAWLER.search("comet memory", {
      minScore: 1,
      limit: 10,
      llmScope: window.AIDA_LLM_SCOPE.retrievalMode()
    }).results;
    assert(allResults.some((item) => item.id === "openai"), "Explicit all-LLM meditation did not include OpenAI memory.", allResults);
    assert(allResults.some((item) => item.id === "xai"), "Explicit all-LLM meditation did not include Grok memory.", allResults);
    assert(allResults.some((item) => item.id === "ollama"), "Explicit all-LLM meditation did not include local memory.", allResults);
    window.AIDA_LLM_SCOPE.consumeAccess();
    assert(window.AIDA_LLM_SCOPE.retrievalMode() === "current", "One-use meditation grant did not reseal.");

    runtime.sleep.whileAway = {
      ready: true,
      llm_provider: "openai",
      thought: "An OpenAI-only thought.",
      offered: false
    };
    const away = window.AIDA_WHILE_AWAY.offerThought();
    assert(away.llm_provider === "xai", "While-away reused another LLM's prepared thought.", away);
    runtime.context.projectMode = "project_payload";
    runtime.context.project = {
      project_name: "aida_architecture",
      latest_summary: 'Across 3 exchange(s) in aida_architecture, the thread moved from "what do you remember" to "goodnight".',
      open_threads: [{ thread: "Should Aida use a more human project summary", status: "user_question" }]
    };
    const shortGreeting = window.AIDA_WHILE_AWAY.buildThought({ gap: { minutes: 180 } });
    const longGreeting = window.AIDA_WHILE_AWAY.buildThought({ gap: { minutes: 60 * 24 * 7 } });
    assert(shortGreeting.protocol?.band === "short", "Three-hour absence did not use short WYWA protocol.", shortGreeting.protocol);
    assert(longGreeting.protocol?.band === "long", "Seven-day absence did not use long WYWA protocol.", longGreeting.protocol);
    assert(longGreeting.protocol.threadCount > shortGreeting.protocol.threadCount, "Long absence was not richer than short absence.", {
      short: shortGreeting.protocol,
      long: longGreeting.protocol
    });
    assert(!/waiting in the dark|lonely|counting minutes/i.test(longGreeting.thought), "WYWA greeting used rejected dependent language.", longGreeting.thought);
    assert(!/Across 3 exchange|\[object Object\]/i.test(shortGreeting.thought), "WYWA leaked storage-shaped summary text.", shortGreeting.thought);

    console.log(JSON.stringify({
      status: "pass",
      startedAt,
      finishedAt: new Date().toISOString(),
      tests: {
        openaiVisibleIds: openaiResults.map((item) => item.id),
        grokVisibleIds: grokResults.map((item) => item.id),
        allLlmVisibleIds: allResults.map((item) => item.id),
        meditationResealed: window.AIDA_LLM_SCOPE.retrievalMode() === "current",
        capturedProvider: captured.tags.llm_provider,
        badge: badge.textContent,
        whileAwayProvider: away.llm_provider,
        wywaBands: {
          short: shortGreeting.protocol,
          long: longGreeting.protocol
        }
      }
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      status: "fail",
      startedAt,
      finishedAt: new Date().toISOString(),
      message: error.message,
      details: error.details || null,
      stack: error.stack
    }, null, 2));
    process.exitCode = 1;
  }
}

main();
