#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const sleepCyclePath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "sleep_cycle.js");
const librarianPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "librarian.js");
const crashBufferPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "crash_buffer.js");
const curatorPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "curator.js");

function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function makeTurn(turnIndex, userText, aidaText, overrides = {}) {
  const sessionId = overrides.sessionId || "session_smoke";
  const tags = {
    session_id: sessionId,
    realm: overrides.realm || "aida_architecture",
    project: overrides.project || "aida_architecture",
    role: overrides.role || "architect_companion",
    emotion: overrides.emotion || "focused",
    custom: overrides.custom || []
  };

  return {
    turnIndex,
    capturedAt: overrides.capturedAt || `2026-06-07T00:00:0${turnIndex}.000Z`,
    user: { role: "user", text: userText },
    aida: { role: "assistant", text: aidaText },
    context: {
      emotion: { label: tags.emotion },
      tags
    },
    tags
  };
}

function makeRuntime(turns, contextEvolution = {}, options = {}) {
  return {
    boot: {},
    drive: { syncQueue: [] },
    tokens: {
      llm: {
        provider: options.llmReady ? "openai" : null,
        key: options.llmReady ? "smoke_key" : null
      }
    },
    context: { emotion: { label: "focused" } },
    mind: {},
    emotionEngine: {
      currentFace: "focused1.png",
      lastAppliedAt: "2026-06-07T00:00:00.000Z",
      history: [],
      snapLog: [],
      faceWishlist: []
    },
    sleep: {
      pendingJournal: [],
      whileAway: { ready: false },
      whileAwaySeed: null,
      whileAwaySeeds: [],
      packets: []
    },
    session: {
      id: "session_smoke",
      startedAt: "2026-06-07T00:00:00.000Z",
      lastTurnAt: turns[turns.length - 1]?.capturedAt || null,
      exchangeCount: turns.length,
      unsaved: true,
      currentTurns: turns
    },
    contextEvolution: {
      queuedChunks: [],
      summaryDrafts: [],
      projectLedgerDrafts: [],
      rollingSummaries: [],
      longSummaryDrafts: [],
      ...contextEvolution
    },
    curator: {
      projectListingDrafts: [],
      projectBriefcaseWriteDrafts: [],
      diaryWriteDrafts: [],
      factWriteDrafts: [],
      insightWriteDrafts: [],
      needsConfirmation: [],
      writePlanDrafts: [],
      reviewLog: []
    }
  };
}

function makeMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear()
  };
}

function installBrowserMocks(runtime, options = {}) {
  const logs = [];
  global.document = { addEventListener() {} };
  global.window = {
    localStorage: options.localStorage || makeMemoryStorage(),
    AIDA_BIOS: { log: (message) => logs.push(message) },
    AIDA_BODY: {
      pulse: (message) => logs.push(message),
      appendChat: () => {}
    },
    AIDA_WHILE_AWAY: {
      buildThought: () => ({
        ready: true,
        generatedAt: "2026-06-07T00:00:00.000Z",
        source: "smoke",
        topic: "sleep distillation",
        thought: "A test thought about sleep draft filling."
      })
    },
    AIDA_CONFIG: {
      llm: {
        sleepMaxOutputTokens: 1800
      }
    },
    AIDA_MODULES: {
      registry: {},
      register(module) {
        this.registry[module.id] = module;
      }
    },
    AIDA_RUNTIME: runtime
  };
  if (options.mockOpenAI) {
    global.window.AIDA_OPENAI = {
      callMessages: async () => JSON.stringify({
        diaryDrafts: [
          {
            id: "diary_llm_smoke",
            session_id: "session_smoke",
            project: "aida_architecture",
            realm: "aida_architecture",
            emotional_shape: "focused",
            entry: "LLM refined diary draft for the smoke packet.",
            source_turns: [1],
            source_refs: ["session_smoke#turn_1"]
          }
        ],
        rollingSummaries: [
          {
            id: "rolling_llm_smoke",
            scope: "project:aida_architecture",
            text: "LLM refined rolling summary.",
            source_refs: ["session_smoke#turn_1"]
          }
        ],
        longSummaryCandidates: [
          {
            id: "long_llm_smoke",
            scope: "project:aida_architecture",
            text: "LLM refined long summary candidate.",
            source_refs: ["session_smoke#turn_1"],
            status: "candidate"
          }
        ],
        factCandidates: [
          {
            id: "fact_llm_smoke",
            scope: "project:aida_architecture",
            claim: "The sleep distiller should support an LLM refinement lane.",
            confidence: 0.7,
            source_refs: ["session_smoke#turn_1"],
            status: "candidate",
            last_seen: "2026-06-07T00:00:01.000Z"
          }
        ],
        insightCandidates: [
          {
            id: "insight_llm_smoke",
            scope: "project:aida_architecture",
            derived_from: ["fact_llm_smoke"],
            guidance: "Keep fallback output intact when LLM refinement is unavailable.",
            confidence: 0.66,
            status: "candidate",
            last_evaluated: "2026-06-07T00:00:01.000Z"
          }
        ],
        projectLedgerUpdates: [],
        openThreads: []
      })
    };
  }
  return logs;
}

function loadCrashBuffer(runtime, localStorage) {
  installBrowserMocks(runtime, { localStorage });
  Function(fs.readFileSync(crashBufferPath, "utf8"))();
  assert(global.window.AIDA_CRASH_BUFFER?.checkpoint, "AIDA_CRASH_BUFFER.checkpoint was not installed.");
  return global.window.AIDA_CRASH_BUFFER;
}

function loadSleepCycle(runtime, options = {}) {
  installBrowserMocks(runtime, options);
  Function(fs.readFileSync(sleepCyclePath, "utf8"))();
  Function(fs.readFileSync(librarianPath, "utf8"))();
  Function(fs.readFileSync(curatorPath, "utf8"))();
  assert(global.window.AIDA_SLEEP?.buildPacket, "AIDA_SLEEP.buildPacket was not installed.");
  assert(global.window.AIDA_LIBRARIAN?.ingestSleep, "AIDA_LIBRARIAN.ingestSleep was not installed.");
  assert(global.window.AIDA_CURATOR?.reviewLibrarian, "AIDA_CURATOR.reviewLibrarian was not installed.");
  return global.window.AIDA_SLEEP;
}

function runOneTurnFallbackTest() {
  const turns = [
    makeTurn(
      1,
      "I need sleep distillation draft filling to preserve diary, rolling summary, facts, insights, and project ledger updates.",
      "I will create runtime-only draft outputs before Drive writeback is enabled."
    )
  ];
  const runtime = makeRuntime(turns);
  const sleep = loadSleepCycle(runtime);
  const packet = sleep.buildPacket("smoke_one_turn_fallback");
  const preferred = sleep.getPreferredDistillation(packet);

  assert(packet.distillation?.status === "draft_filled", "One-turn packet did not fill distillation.");
  assert(preferred.ready, "Preferred fallback distillation was not ready.", preferred);
  assert(preferred.source === "fallback", "Preferred one-turn distillation should be fallback.", preferred);
  assert(packet.distillation.diaryDrafts.length >= 1, "One-turn packet did not create a diary draft.");
  assert(packet.distillation.rollingSummaries.length >= 1, "One-turn packet did not create a rolling summary.");
  assert(packet.distillation.longSummaryCandidates.length >= 1, "One-turn packet did not create a long summary candidate.");
  assert(packet.distillation.factCandidates.length >= 1, "One-turn packet did not stage a fact candidate.");
  assert(runtime.contextEvolution.rollingSummaries.length >= 1, "Runtime rolling summaries were not updated.");
  assert(runtime.contextEvolution.longSummaryDrafts.length >= 1, "Runtime long summary drafts were not updated.");
  assert(runtime.librarian?.diaryDrafts?.length >= 1, "Librarian did not stage fallback diary drafts.");
  assert(runtime.librarian?.projectBriefcaseDrafts?.length >= 1, "Librarian did not stage fallback project briefcase drafts.");
  global.window.AIDA_CURATOR.reviewLibrarian();
  assert(runtime.curator?.projectListingDrafts?.length >= 1, "Curator did not stage fallback project listing draft.", runtime.curator);
  assert(runtime.curator?.writePlanDrafts?.length >= 1, "Curator did not stage fallback write plan.", runtime.curator);

  return {
    packetId: packet.id,
    diaryDrafts: packet.distillation.diaryDrafts.length,
    rollingSummaries: packet.distillation.rollingSummaries.length,
    longSummaryCandidates: packet.distillation.longSummaryCandidates.length,
    factCandidates: packet.distillation.factCandidates.length,
    insightCandidates: packet.distillation.insightCandidates.length,
    preferredSource: preferred.source,
    preferredMethod: preferred.method,
    librarianDiaryDrafts: runtime.librarian.diaryDrafts.length,
    librarianProjectDrafts: runtime.librarian.projectBriefcaseDrafts.length,
    curatorProjectListings: runtime.curator.projectListingDrafts.length,
    curatorWritePlans: runtime.curator.writePlanDrafts.length
  };
}

function runChunkDraftTest() {
  const turns = [
    makeTurn(1, "I need the sleep draft filler to use source refs.", "I will preserve source references."),
    makeTurn(2, "The project should stage ledger updates but not write Drive yet.", "I will keep ledger updates as drafts."),
    makeTurn(3, "We want facts and insights to stay candidates until confirmed.", "I will keep promotion conservative.")
  ];
  const runtime = makeRuntime(turns, {
    summaryDrafts: [
      {
        id: "session_smoke_chunk_1_3_summary_draft",
        chunkId: "session_smoke_chunk_1_3",
        status: "needs_llm_summary",
        sessionId: "session_smoke",
        turnStart: 1,
        turnEnd: 3,
        tags: {
          realm: "aida_architecture",
          project: "aida_architecture",
          role: "architect_companion"
        },
        outputs: {}
      }
    ],
    projectLedgerDrafts: [
      {
        id: "session_smoke_chunk_1_3_project_ledger_draft",
        sourceSummaryDraftId: "session_smoke_chunk_1_3_summary_draft",
        sourceChunkId: "session_smoke_chunk_1_3",
        status: "needs_summary_outputs",
        update: {}
      }
    ]
  });
  const sleep = loadSleepCycle(runtime);
  const packet = sleep.buildPacket("smoke_chunk_draft");
  const summaryDraft = packet.contextEvolution.summaryDrafts[0];
  const ledgerDraft = packet.projectLedgerDrafts[0];

  assert(summaryDraft.status === "draft_filled", "Summary draft was not marked draft_filled.", summaryDraft);
  assert(summaryDraft.outputs?.diary_candidate, "Summary draft did not receive diary output.", summaryDraft);
  assert(ledgerDraft.status === "draft_filled", "Project ledger draft was not marked draft_filled.", ledgerDraft);
  assert(Boolean(ledgerDraft.update?.latest_summary), "Project ledger draft did not receive latest_summary.", ledgerDraft);
  assert(Array.isArray(ledgerDraft.update?.facts_to_consider), "Project ledger draft facts_to_consider is missing.", ledgerDraft);
  assert(packet.distillation.counts.summaryDraftsFilled === 1, "Packet did not count one filled summary draft.");
  assert(packet.distillation.counts.ledgerDraftsFilled === 1, "Packet did not count one filled ledger draft.");
  assert(runtime.librarian?.projectBriefcaseDrafts?.length >= 1, "Librarian did not stage chunk project briefcase draft.");

  return {
    packetId: packet.id,
    summaryStatus: summaryDraft.status,
    ledgerStatus: ledgerDraft.status,
    ledgerHasSummary: Boolean(ledgerDraft.update.latest_summary),
    factsToConsider: ledgerDraft.update.facts_to_consider.length,
    insightsToConsider: ledgerDraft.update.insights_to_consider.length,
    librarianProjectDrafts: runtime.librarian.projectBriefcaseDrafts.length
  };
}

async function runLlmRefinementTest() {
  const turns = [
    makeTurn(
      1,
      "I need the LLM sleep distiller to refine the fallback draft.",
      "I will keep the fallback active and then merge an LLM draft if available."
    )
  ];
  const runtime = makeRuntime(turns, {}, { llmReady: true });
  const sleep = loadSleepCycle(runtime, { mockOpenAI: true });
  const packet = sleep.buildPacket("smoke_llm_refinement");
  const distillation = await sleep.refinePacketWithLlm(packet);
  const preferred = sleep.getPreferredDistillation(packet);

  assert(distillation.status === "llm_draft_filled", "LLM refinement did not mark distillation as llm_draft_filled.", distillation);
  assert(preferred.source === "llm", "Preferred distillation did not switch to LLM after refinement.", preferred);
  assert(distillation.method === "llm_refined_draft", "LLM refinement did not set method.", distillation);
  assert(distillation.fallback?.status === "draft_filled", "LLM refinement did not preserve fallback distillation.", distillation);
  assert(distillation.llm?.status === "complete", "LLM refinement did not mark llm status complete.", distillation);
  assert(distillation.diaryDrafts[0]?.id === "diary_llm_smoke", "LLM diary draft was not applied.", distillation);
  assert(runtime.librarian?.diaryDrafts?.some((item) => item.id === "diary_llm_smoke"), "Librarian did not stage LLM diary draft.", runtime.librarian);
  assert(runtime.librarian?.diaryDrafts?.length === 1, "Librarian should replace fallback diary drafts for the same packet after LLM refinement.", runtime.librarian);
  assert(runtime.librarian?.projectBriefcaseDrafts?.some((item) => item.source === "llm"), "Librarian did not stage an LLM project briefcase draft.", runtime.librarian);
  global.window.AIDA_CURATOR.reviewLibrarian();
  assert(runtime.curator?.projectListingDrafts?.some((item) => item.source === "llm"), "Curator did not stage LLM project listing draft.", runtime.curator);
  assert(runtime.curator?.writePlanDrafts?.length >= 1, "Curator did not stage LLM write plan.", runtime.curator);

  return {
    packetId: packet.id,
    status: distillation.status,
    method: distillation.method,
    llmStatus: distillation.llm.status,
    fallbackStatus: distillation.fallback.status,
    diaryDrafts: distillation.diaryDrafts.length,
    factCandidates: distillation.factCandidates.length,
    preferredSource: preferred.source,
    preferredMethod: preferred.method,
    librarianDiaryDrafts: runtime.librarian.diaryDrafts.length,
    librarianProjectDrafts: runtime.librarian.projectBriefcaseDrafts.length,
    curatorProjectListings: runtime.curator.projectListingDrafts.length,
    curatorWritePlans: runtime.curator.writePlanDrafts.length
  };
}

function runCrashBufferRestoreTest() {
  const localStorage = makeMemoryStorage();
  const turns = [
    makeTurn(1, "I need this long session to survive a hard restart.", "I will checkpoint the captured exchange."),
    makeTurn(2, "The project should not lose queued summary drafts.", "I will preserve context evolution state."),
    makeTurn(3, "We want Librarian to pick this up after reload.", "I will keep the pending journal recoverable.")
  ];
  const runtimeBefore = makeRuntime(turns, {
    queuedChunks: [
      {
        id: "session_smoke_chunk_1_3",
        status: "summary_draft_prepared",
        sessionId: "session_smoke",
        turnStart: 1,
        turnEnd: 3
      }
    ],
    summaryDrafts: [
      {
        id: "session_smoke_chunk_1_3_summary_draft",
        chunkId: "session_smoke_chunk_1_3",
        status: "needs_llm_summary",
        sessionId: "session_smoke",
        turnStart: 1,
        turnEnd: 3
      }
    ],
    projectLedgerDrafts: [
      {
        id: "session_smoke_chunk_1_3_project_ledger_draft",
        sourceSummaryDraftId: "session_smoke_chunk_1_3_summary_draft",
        status: "needs_summary_outputs"
      }
    ]
  });
  runtimeBefore.sleep.pendingJournal = [
    { type: "exchange", sessionId: "session_smoke", turnIndex: 1 },
    { type: "summary_draft", sessionId: "session_smoke", draftId: "session_smoke_chunk_1_3_summary_draft" }
  ];

  const before = loadCrashBuffer(runtimeBefore, localStorage);
  const checkpoint = before.checkpoint("smoke_restart_checkpoint");
  assert(checkpoint.ok, "Crash buffer checkpoint failed.", checkpoint);

  const runtimeAfter = makeRuntime([]);
  const after = loadCrashBuffer(runtimeAfter, localStorage);
  const restored = after.restore();
  assert(restored.ok, "Crash buffer restore failed.", restored);
  assert(runtimeAfter.session.currentTurns.length === 3, "Crash buffer did not restore captured turns.", runtimeAfter.session);
  assert(runtimeAfter.contextEvolution.summaryDrafts.length === 1, "Crash buffer did not restore summary drafts.", runtimeAfter.contextEvolution);
  assert(runtimeAfter.contextEvolution.projectLedgerDrafts.length === 1, "Crash buffer did not restore project ledger drafts.", runtimeAfter.contextEvolution);
  assert(runtimeAfter.sleep.pendingJournal.length === 2, "Crash buffer did not restore pending journal.", runtimeAfter.sleep);

  return {
    checkpointSavedAt: checkpoint.savedAt,
    restoredAt: restored.restoredAt,
    exchangeCount: runtimeAfter.session.currentTurns.length,
    summaryDraftCount: runtimeAfter.contextEvolution.summaryDrafts.length,
    projectLedgerDraftCount: runtimeAfter.contextEvolution.projectLedgerDrafts.length,
    pendingJournalCount: runtimeAfter.sleep.pendingJournal.length
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  try {
    assert(fs.existsSync(sleepCyclePath), `Missing sleep cycle source: ${sleepCyclePath}`);
    assert(fs.existsSync(librarianPath), `Missing librarian source: ${librarianPath}`);
    assert(fs.existsSync(crashBufferPath), `Missing crash buffer source: ${crashBufferPath}`);
    assert(fs.existsSync(curatorPath), `Missing curator source: ${curatorPath}`);
    const result = {
      status: "pass",
      startedAt,
      finishedAt: new Date().toISOString(),
      source: sleepCyclePath,
      tests: {
        oneTurnFallback: runOneTurnFallbackTest(),
        chunkDraft: runChunkDraftTest(),
        llmRefinement: await runLlmRefinementTest(),
        crashBufferRestore: runCrashBufferRestoreTest()
      }
    };
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    const result = {
      status: "fail",
      startedAt,
      finishedAt: new Date().toISOString(),
      source: sleepCyclePath,
      message: error.message,
      details: error.details || null,
      stack: error.stack
    };
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  }
}

main();
