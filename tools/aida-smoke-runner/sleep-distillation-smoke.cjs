#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const sleepCyclePath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "sleep_cycle.js");
const librarianPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "librarian.js");
const crashBufferPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "crash_buffer.js");
const curatorPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "curator.js");
const crawlerPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "crawler.js");
const llmMessagesPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "llm_messages.js");
const driveWritebackPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "drive_writeback.js");

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
    mind: {
      identity: { name: "Aida" },
      realm: { name: "aida_architecture" },
      role: { name: "architect_companion" },
      facts: { items: ["Aida uses indexed memory evidence for recall."] },
      memory: { summaries: ["Aida is testing strict memory recall boundaries."] },
      insights: { items: [] },
      session: { turns: [] }
    },
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
      sensitiveContextWriteDrafts: [],
      salutationSignalWriteDrafts: [],
      rawLogWriteDrafts: [],
      processingBacklogWriteDrafts: [],
      needsConfirmation: [],
      writePlanDrafts: [],
      reviewLog: []
    },
    crawler: {
      key: "AIDA_CRAWLER_INDEX_V1",
      entries: [],
      searches: []
    },
    driveWriteback: {
      operations: [],
      history: []
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
    let callCount = 0;
    global.window.AIDA_OPENAI = {
      callMessages: async (messages) => {
        callCount += 1;
        const promptText = messages.map((message) => message.content || "").join("\n");
        const isContinuityPass = promptText.includes("This pass is continuity");
        const isSemanticPass = promptText.includes("This pass is semantic");
        const isRelationshipPass = promptText.includes("This pass is relationship");
        if (options.mockFailedSemanticPassOpenAI && (isSemanticPass || promptText.includes("unfinished"))) {
          return '{"packetId":"sleep_smoke","memoryReview":{"durableFacts":[{"claim":"unfinished"';
        }
        if (options.mockPartialOpenAI) {
          return JSON.stringify({
            diaryDrafts: [
              {
                id: "diary_partial_llm_smoke",
                session_id: "session_smoke",
                project: "aida_architecture",
                realm: "aida_architecture",
                emotional_shape: "focused",
                entry: "Partial LLM diary only.",
                source_turns: [1],
                source_refs: ["session_smoke#turn_1"]
              }
            ],
            rollingSummaries: [],
            longSummaryCandidates: [],
            factCandidates: [],
            insightCandidates: [],
            sensitiveContextCandidates: [],
            salutationSignals: [],
            rawLogEntries: [],
            processingBacklog: [],
            projectLedgerUpdates: [],
            openThreads: []
          });
        }
        if (options.mockMalformedOpenAI && callCount === 1) {
          return '{"diaryDrafts":[{"id":"broken_json" "entry":"missing comma"}],"rollingSummaries":[]';
        }
        if (options.mockMemoryRoutingReviewOpenAI) {
          return JSON.stringify({
            packetId: "sleep_smoke",
            capturedAt: "2026-06-16T23:12:33.223Z",
            memoryReview: {
              project: "aida_architecture",
              source_refs: ["session_smoke#turn_1"],
              diaryEntry: isContinuityPass ? "Francisco clarified that his mother lives in Kansas City while he was driving to the airport." : "",
              sessionSummary: isContinuityPass ? "A short affectionate exchange included a temporary airport pickup and a durable residence detail." : "",
              longSummary: isContinuityPass ? "Aida should distinguish temporary logistics from stable user facts." : "",
              durableFacts: isSemanticPass ? [
                {
                  claim: "Francisco's mother lives in Kansas City.",
                  scope: "user",
                  confidence: 0.95,
                  source_refs: ["session_smoke#turn_1"]
                },
                {
                  claim: "Francisco needs to pick up his mom at the airport.",
                  scope: "user",
                  confidence: 0.95,
                  source_refs: ["session_smoke#turn_1"]
                }
              ] : [],
              behaviorInsights: [],
              sensitiveContext: isSemanticPass ? [
                {
                  note: "Francisco is tired and managing caregiving logistics for an airport pickup, indicating emotional and physical strain.",
                  handling: "Respond gently without probing.",
                  confidence: 0.9,
                  source_refs: ["session_smoke#turn_1"]
                }
              ] : [],
              toneSignals: [],
              openThreads: [],
              needsFurtherProcessing: false
            }
          });
        }
        if (options.mockCompactReviewOpenAI) {
          return JSON.stringify({
            packetId: "sleep_smoke",
            capturedAt: "2026-06-07T00:00:01.000Z",
            memoryReview: {
              project: "aida_architecture",
              source_refs: ["session_smoke#turn_1"],
              diaryEntry: isContinuityPass ? "Aida and the user tested the compact memory review shape before Drive writeback." : "",
              sessionSummary: isContinuityPass ? "The compact review should parse into existing sleep shelves." : "",
              longSummary: isContinuityPass ? "Aida is moving toward LLM-first memory review with fallback shelves preserved." : "",
              durableFacts: isSemanticPass ? [
                {
                  claim: "AIDA sleep writeback now has a compact LLM memory review path.",
                  scope: "project:aida_architecture",
                  confidence: 0.76,
                  source_refs: ["session_smoke#turn_1"]
                }
              ] : [],
              behaviorInsights: isSemanticPass ? [
                {
                  guidance: "Show compact sleep summaries for human review before real Drive writes.",
                  confidence: 0.72,
                  source_refs: ["session_smoke#turn_1"]
                }
              ] : [],
              sensitiveContext: [],
              toneSignals: isRelationshipPass ? [
                {
                  observed_text: "hello my sweet child",
                  guidance: "Warm openings are welcome when the user begins affectionately.",
                  warmth: "affectionate",
                  source_ref: "session_smoke#turn_1"
                }
              ] : [],
              openThreads: [],
              needsFurtherProcessing: false
            }
          });
        }
        return JSON.stringify({
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
        sensitiveContextCandidates: [
          {
            id: "sensitive_llm_smoke",
            scope: "user",
            note: "The user shared tender family context that should be handled gently.",
            handling: "Do not raise unprompted unless relevant.",
            confidence: 0.7,
            source_refs: ["session_smoke#turn_1"],
            status: "candidate"
          }
        ],
        salutationSignals: [
          {
            id: "salutation_llm_smoke",
            type: "salutation_tone_signal",
            observed_text: "hello my sweet child",
            warmth: "affectionate",
            suggested_use: "Respond with warm steadiness when appropriate.",
            source_ref: "session_smoke#turn_1",
            confidence: 0.68
          }
        ],
        rawLogEntries: [
          {
            id: "raw_log_llm_smoke_1",
            packetId: "sleep_smoke",
            session_id: "session_smoke",
            turnIndex: 1,
            capturedAt: "2026-06-07T00:00:01.000Z",
            project: "aida_architecture",
            realm: "aida_architecture",
            user: "I need the LLM sleep distiller to refine the fallback draft.",
            aida: "I will keep the fallback active and then merge an LLM draft if available.",
            source_refs: ["session_smoke#turn_1"]
          }
        ],
        processingBacklog: [],
        projectLedgerUpdates: [],
        openThreads: []
        });
      }
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
  Function(fs.readFileSync(crawlerPath, "utf8"))();
  Function(fs.readFileSync(driveWritebackPath, "utf8"))();
  assert(global.window.AIDA_SLEEP?.buildPacket, "AIDA_SLEEP.buildPacket was not installed.");
  assert(global.window.AIDA_LIBRARIAN?.ingestSleep, "AIDA_LIBRARIAN.ingestSleep was not installed.");
  assert(global.window.AIDA_CURATOR?.reviewLibrarian, "AIDA_CURATOR.reviewLibrarian was not installed.");
  assert(global.window.AIDA_CRAWLER?.search, "AIDA_CRAWLER.search was not installed.");
  assert(global.window.AIDA_DRIVE_WRITEBACK?.preview, "AIDA_DRIVE_WRITEBACK.preview was not installed.");
  return global.window.AIDA_SLEEP;
}

function loadCrawlerAndMessages(runtime, options = {}) {
  installBrowserMocks(runtime, options);
  runtime.boot.driveLoaded = true;
  runtime.context.identity = runtime.mind.identity;
  runtime.context.realm = runtime.mind.realm;
  runtime.context.role = runtime.mind.role;
  runtime.context.projectName = "aida_architecture";
  runtime.context.projectFacts = runtime.mind.facts;
  runtime.context.projectMemory = runtime.mind.memory;
  Function(fs.readFileSync(crawlerPath, "utf8"))();
  Function(fs.readFileSync(librarianPath, "utf8"))();
  Function(fs.readFileSync(llmMessagesPath, "utf8"))();
  assert(global.window.AIDA_CRAWLER?.remember, "AIDA_CRAWLER.remember was not installed.");
  assert(global.window.AIDA_LLM_MESSAGES?.build, "AIDA_LLM_MESSAGES.build was not installed.");
  return {
    crawler: global.window.AIDA_CRAWLER,
    messages: global.window.AIDA_LLM_MESSAGES
  };
}

function runOneTurnFallbackTest() {
  const turns = [
    makeTurn(
      1,
      "hello my sweet child, I need sleep distillation draft filling to preserve diary, rolling summary, and project ledger updates.",
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
  assert(packet.distillation.diaryDrafts[0].review_window?.turn_start === 1, "Diary draft did not include a review window.", packet.distillation.diaryDrafts[0]);
  assert(packet.distillation.rollingSummaries.length >= 1, "One-turn packet did not create a rolling summary.");
  assert(packet.distillation.longSummaryCandidates.length >= 1, "One-turn packet did not create a long summary candidate.");
  assert(packet.distillation.factCandidates.length === 0, "Fallback should not stage fact candidates without LLM review.", packet.distillation.factCandidates);
  assert(packet.distillation.insightCandidates.length === 0, "Fallback should not stage insight candidates without LLM review.", packet.distillation.insightCandidates);
  assert(packet.distillation.rawLogEntries.length >= 1, "Fallback did not preserve raw log entries.");
  assert(packet.distillation.salutationSignals.length >= 1, "Fallback did not capture salutation tone signals.");
  assert(packet.distillation.processingBacklog.length >= 1, "Fallback did not mark memory for later LLM processing.");
  assert(runtime.contextEvolution.rollingSummaries.length >= 1, "Runtime rolling summaries were not updated.");
  assert(runtime.contextEvolution.longSummaryDrafts.length >= 1, "Runtime long summary drafts were not updated.");
  assert(runtime.librarian?.diaryDrafts?.length >= 1, "Librarian did not stage fallback diary drafts.");
  assert(runtime.librarian.diaryDrafts[0].review_window?.source_refs?.length >= 1, "Librarian diary draft did not preserve review window source refs.", runtime.librarian.diaryDrafts[0]);
  assert(runtime.librarian?.projectBriefcaseDrafts?.length >= 1, "Librarian did not stage fallback project briefcase drafts.");
  assert(runtime.librarian?.rawLogEntries?.length >= 1, "Librarian did not stage raw log entries.");
  assert(runtime.librarian?.salutationSignals?.length >= 1, "Librarian did not stage salutation signals.");
  assert(runtime.librarian?.processingBacklog?.length >= 1, "Librarian did not stage processing backlog.");
  global.window.AIDA_CURATOR.reviewLibrarian();
  assert(runtime.curator?.projectListingDrafts?.length >= 1, "Curator did not stage fallback project listing draft.", runtime.curator);
  assert(runtime.curator?.writePlanDrafts?.length >= 1, "Curator did not stage fallback write plan.", runtime.curator);
  assert(runtime.curator?.rawLogWriteDrafts?.length >= 1, "Curator did not stage raw log write drafts.", runtime.curator);
  assert(runtime.curator?.salutationSignalWriteDrafts?.length >= 1, "Curator did not stage salutation signal write drafts.", runtime.curator);
  assert(runtime.curator?.processingBacklogWriteDrafts?.length >= 1, "Curator did not stage processing backlog write drafts.", runtime.curator);
  const recall = global.window.AIDA_CRAWLER.remember("project ledger updates");
  assert(recall.found, "Crawler did not recall fallback memory.", recall);
  const diaryEntry = runtime.crawler.entries.find((item) => item.type === "diary_draft");
  assert(diaryEntry?.reviewWindow?.turn_start === 1, "Crawler did not index diary review window.", diaryEntry);
  assert(/Review window/i.test(diaryEntry.text), "Crawler diary entry did not include review window text.", diaryEntry);
  const unknown = global.window.AIDA_CRAWLER.remember("the blue pineapple deployment password");
  assert(!unknown.found, "Crawler fabricated a recall for an unknown memory.", unknown);
  assert(/do not know/i.test(unknown.reply), "Unknown recall reply should admit not knowing.", unknown);

  return {
    packetId: packet.id,
    diaryDrafts: packet.distillation.diaryDrafts.length,
    rollingSummaries: packet.distillation.rollingSummaries.length,
    longSummaryCandidates: packet.distillation.longSummaryCandidates.length,
    factCandidates: packet.distillation.factCandidates.length,
    insightCandidates: packet.distillation.insightCandidates.length,
    rawLogEntries: packet.distillation.rawLogEntries.length,
    salutationSignals: packet.distillation.salutationSignals.length,
    processingBacklog: packet.distillation.processingBacklog.length,
    preferredSource: preferred.source,
    preferredMethod: preferred.method,
    librarianDiaryDrafts: runtime.librarian.diaryDrafts.length,
    diaryReviewWindow: runtime.librarian.diaryDrafts[0].review_window,
    librarianProjectDrafts: runtime.librarian.projectBriefcaseDrafts.length,
    curatorProjectListings: runtime.curator.projectListingDrafts.length,
    curatorWritePlans: runtime.curator.writePlanDrafts.length,
    curatorRawLogWrites: runtime.curator.rawLogWriteDrafts.length,
    curatorSalutationWrites: runtime.curator.salutationSignalWriteDrafts.length,
    crawlerEntries: runtime.crawler.entries.length,
    crawlerRecallFound: recall.found,
    crawlerUnknownRecallFound: unknown.found
  };
}

function runMemoryBoundaryMessageTest() {
  const runtime = makeRuntime([]);
  const { messages } = loadCrawlerAndMessages(runtime);
  const built = messages.build("Do you remember the blue pineapple deployment password?");
  assert(!built.blocked, "LLM message build was blocked unexpectedly.", built);
  const system = built.messages[0].content;
  assert(system.includes("Strict memory rule"), "LLM system prompt is missing strict memory rule.", system);
  assert(system.includes("found\": false"), "LLM retrieval section should say no indexed memory was found.", system);
  assert(system.includes("Do not invent the missing memory"), "LLM retrieval section is missing no-invention instruction.", system);

  return {
    messageCount: built.messages.length,
    recallFound: runtime.context.lastCrawlerRecall?.found,
    systemHasStrictRule: system.includes("Strict memory rule")
  };
}

function runDriveBackedLibrarianTest() {
  const runtime = makeRuntime([]);
  runtime.drive.files = {
    "diary_log.json": [
      {
        id: "diary_lighthouse",
        project: "aida_architecture",
        entry: "Francisco described the lighthouse promise as a way to preserve a precise shared idea.",
        source_refs: ["session_archive#turn_7"],
        packetId: "sleep_archive"
      }
    ],
    "raw_session_log.json": [
      {
        id: "raw_lighthouse",
        project: "aida_architecture",
        user: "Please remember the lighthouse promise.",
        aida: "I will keep it tied to the source.",
        source_refs: ["session_archive#turn_7"]
      }
    ],
    "facts.json": {
      facts: {
        user: {
          family: ["Francisco's mother lives in Kansas City."]
        }
      },
      last_updated: "2026-06-16T23:16:19.421Z"
    },
    "insights.json": {
      insights: {
        collaboration: {
          memory_style: "Francisco prefers memory claims to remain tied to evidence."
        }
      }
    }
  };
  const { crawler, messages } = loadCrawlerAndMessages(runtime);
  const indexed = crawler.indexNow("smoke_drive_memory");
  const review = global.window.AIDA_LIBRARIAN.review("librarian, skim the diary for the lighthouse promise", {
    minScore: 1
  });
  const built = messages.build("Librarian, skim my diary for the lighthouse promise.");

  assert(indexed.summary.types.drive_diary >= 1, "Crawler did not index Drive diary records.", indexed.summary);
  assert(indexed.summary.types.drive_raw_log >= 1, "Crawler did not index Drive raw logs.", indexed.summary);
  assert(indexed.summary.types.drive_fact >= 1, "Crawler did not flatten nested confirmed facts.", indexed.summary);
  assert(indexed.summary.types.drive_insight >= 1, "Crawler did not flatten nested confirmed insights.", indexed.summary);
  assert(review.ready && review.resultCount >= 1, "Librarian review did not return Drive-backed evidence.", review);
  assert(
    review.evidence.some((item) => item.text.includes("lighthouse promise")),
    "Librarian evidence did not include the matching diary text.",
    review
  );
  assert(
    built.messages[0].content.includes('"tool": "librarian"'),
    "Conversational librarian request was not routed into the LLM evidence section.",
    built.messages[0].content
  );

  return {
    indexedTypes: indexed.summary.types,
    reviewResults: review.resultCount,
    evidenceKinds: Object.keys(review.grouped),
    routedTool: runtime.context.lastLibrarianReview ? "librarian" : null
  };
}

function runMultimodalMessageShapeTest() {
  const runtime = makeRuntime([]);
  const { messages } = loadCrawlerAndMessages(runtime);
  const image = messages.build("What do you notice?", {
    attachment: {
      name: "desk.png",
      kind: "image",
      type: "image/png",
      size: 10,
      dataUrl: "data:image/png;base64,AAAA"
    }
  });
  const pdf = messages.build("Please skim this document.", {
    attachment: {
      name: "notes.pdf",
      kind: "pdf",
      type: "application/pdf",
      size: 20,
      dataUrl: "data:application/pdf;base64,BBBB"
    }
  });
  const imageContent = image.messages[1].content;
  const pdfContent = pdf.messages[1].content;

  assert(Array.isArray(imageContent), "Image attachment should produce multimodal content.", imageContent);
  assert(imageContent.some((item) => item.type === "input_image"), "Image attachment is missing input_image.", imageContent);
  assert(Array.isArray(pdfContent), "PDF attachment should produce multimodal content.", pdfContent);
  assert(pdfContent.some((item) => item.type === "input_file"), "PDF attachment is missing input_file.", pdfContent);
  assert(pdfContent.find((item) => item.type === "input_file")?.filename === "notes.pdf", "PDF filename was not preserved.", pdfContent);

  return {
    imageTypes: imageContent.map((item) => item.type),
    pdfTypes: pdfContent.map((item) => item.type),
    imageAttachment: image.safeSummary.attachment,
    pdfAttachment: pdf.safeSummary.attachment
  };
}

async function runDriveWritebackDryRunTest() {
  const turns = [
    makeTurn(
      1,
      "Writeback should append diary and update the project summary after curator review.",
      "I will stage Drive operations but only dry-run in smoke."
    )
  ];
  const runtime = makeRuntime(turns);
  const sleep = loadSleepCycle(runtime);
  const packet = sleep.buildPacket("smoke_drive_writeback");
  global.window.AIDA_CURATOR.reviewLibrarian();
  const preview = global.window.AIDA_DRIVE_WRITEBACK.preview();
  assert(preview.ready, "Drive writeback preview was not ready.", preview);
  assert(preview.operations.some((op) => op.fileName === "diary_log.json"), "Drive writeback preview is missing diary_log.json.", preview);
  assert(preview.operations.some((op) => op.fileName === "project_summary.json"), "Drive writeback preview is missing project_summary.json.", preview);
  assert(preview.operations.some((op) => op.fileName === "raw_session_log.json"), "Drive writeback preview is missing raw_session_log.json.", preview);
  assert(preview.operations.some((op) => op.fileName === "memory_processing_backlog.json"), "Drive writeback preview is missing memory_processing_backlog.json.", preview);
  const dryRun = await global.window.AIDA_DRIVE_WRITEBACK.apply();
  assert(dryRun.ready, "Drive writeback dry-run was not ready.", dryRun);
  assert(dryRun.dryRun, "Drive writeback smoke should not perform real Drive writes.", dryRun);
  assert(dryRun.operations.length >= 5, "Drive writeback dry-run did not build expected operations.", dryRun);

  return {
    packetId: packet.id,
    previewOperations: preview.operations.length,
    dryRunOperations: dryRun.operations.length,
    targets: dryRun.operations.map((op) => op.target)
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
  assert(Array.isArray(ledgerDraft.update?.salutation_tone_signals), "Project ledger draft salutation_tone_signals is missing.", ledgerDraft);
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
    salutationSignals: ledgerDraft.update.salutation_tone_signals.length,
    librarianProjectDrafts: runtime.librarian.projectBriefcaseDrafts.length
  };
}

function runFreshCollectionBoundaryTest() {
  const turns = [
    makeTurn(1, "Old restored memory should not be recollected.", "I will remain in the restored buffer.", {
      capturedAt: "2026-06-14T20:00:00.000Z"
    }),
    makeTurn(2, "Old project summary should stay out of the new packet.", "I will not dominate fresh sleep.", {
      capturedAt: "2026-06-14T20:01:00.000Z"
    }),
    makeTurn(3, "Hello Beautiful! how was your nap?", "Hello, Francisco. I am awake and warm.", {
      capturedAt: "2026-06-16T21:26:38.744Z"
    }),
    makeTurn(4, "I need to pick up my mom at the airport. She lives in Kansas City.", "I can help make a plan now, but I cannot remind you later yet.", {
      capturedAt: "2026-06-16T21:28:00.628Z"
    }),
    makeTurn(5, "I think you are good at keeping things organized.", "I will try to live up to that role.", {
      capturedAt: "2026-06-16T21:29:00.456Z"
    })
  ];
  const runtime = makeRuntime(turns, {
    summaryDrafts: [
      {
        id: "old_chunk_1_2_summary_draft",
        sessionId: "session_smoke",
        turnStart: 1,
        turnEnd: 2,
        tags: turns[0].tags
      },
      {
        id: "fresh_chunk_3_5_summary_draft",
        sessionId: "session_smoke",
        turnStart: 3,
        turnEnd: 5,
        tags: turns[2].tags
      }
    ],
    projectLedgerDrafts: [
      {
        id: "old_chunk_1_2_summary_draft_project_ledger_draft",
        sourceSummaryDraftId: "old_chunk_1_2_summary_draft",
        status: "needs_summary_outputs",
        project: { name: "aida_architecture", realm: "aida_architecture" },
        update: {}
      },
      {
        id: "fresh_chunk_3_5_summary_draft_project_ledger_draft",
        sourceSummaryDraftId: "fresh_chunk_3_5_summary_draft",
        status: "needs_summary_outputs",
        project: { name: "aida_architecture", realm: "aida_architecture" },
        update: {}
      }
    ]
  });
  runtime.sleep.lastCollectedAt = "2026-06-15T00:00:00.000Z";
  const sleep = loadSleepCycle(runtime);
  const packet = sleep.buildPacket("smoke_fresh_collection_boundary");
  const rawTurns = packet.distillation.rawLogEntries.map((item) => item.turnIndex);

  assert(packet.collectionWindow.since === "2026-06-15T00:00:00.000Z", "Packet did not anchor on prior sleep collection.", packet.collectionWindow);
  assert(packet.session.exchangeCount === 3, "Fresh sleep packet should include only turns after the collection boundary.", packet.session);
  assert(packet.session.totalExchangeCount === 5, "Packet should retain total restored exchange count for diagnostics.", packet.session);
  assert(JSON.stringify(rawTurns) === JSON.stringify([3, 4, 5]), "Raw log entries leaked old restored turns.", rawTurns);
  assert(packet.contextEvolution.summaryDrafts.length === 1, "Context evolution should include only fresh summary drafts.", packet.contextEvolution);
  assert(packet.contextEvolution.summaryDrafts[0].id === "fresh_chunk_3_5_summary_draft", "Wrong summary draft survived fresh boundary.", packet.contextEvolution.summaryDrafts);
  assert(packet.projectLedgerDrafts.length === 1, "Packet should include only ledger drafts tied to fresh summary drafts.", packet.projectLedgerDrafts);
  assert(packet.projectLedgerDrafts[0].sourceSummaryDraftId === "fresh_chunk_3_5_summary_draft", "Old ledger draft leaked through fresh boundary.", packet.projectLedgerDrafts);
  assert(runtime.sleep.lastCollectedAt === packet.capturedAt, "Sleep collection boundary was not advanced after packet build.", runtime.sleep);

  return {
    packetId: packet.id,
    since: packet.collectionWindow.since,
    exchangeCount: packet.session.exchangeCount,
    totalExchangeCount: packet.session.totalExchangeCount,
    rawTurns,
    summaryDrafts: packet.contextEvolution.summaryDrafts.length,
    ledgerDrafts: packet.projectLedgerDrafts.length
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
  assert(distillation.sensitiveContextCandidates.length === 1, "LLM sensitive context candidates were not applied.", distillation);
  assert(distillation.salutationSignals.length === 1, "LLM salutation signals were not applied.", distillation);
  assert(distillation.rawLogEntries.length === 1, "LLM raw log entries were not applied.", distillation);
  assert(runtime.librarian?.diaryDrafts?.some((item) => item.id === "diary_llm_smoke"), "Librarian did not stage LLM diary draft.", runtime.librarian);
  assert(runtime.librarian?.diaryDrafts?.length === 1, "Librarian should replace fallback diary drafts for the same packet after LLM refinement.", runtime.librarian);
  assert(runtime.librarian?.projectBriefcaseDrafts?.some((item) => item.source === "llm"), "Librarian did not stage an LLM project briefcase draft.", runtime.librarian);
  assert(runtime.librarian?.sensitiveContextCandidates?.length === 1, "Librarian did not stage LLM sensitive context.", runtime.librarian);
  assert(runtime.librarian?.salutationSignals?.length === 1, "Librarian did not stage LLM salutation signals.", runtime.librarian);
  global.window.AIDA_CURATOR.reviewLibrarian();
  assert(runtime.curator?.projectListingDrafts?.some((item) => item.source === "llm"), "Curator did not stage LLM project listing draft.", runtime.curator);
  assert(runtime.curator?.writePlanDrafts?.length >= 1, "Curator did not stage LLM write plan.", runtime.curator);
  assert(runtime.curator?.sensitiveContextWriteDrafts?.length === 1, "Curator did not stage sensitive context write drafts.", runtime.curator);
  assert(runtime.curator?.salutationSignalWriteDrafts?.length === 1, "Curator did not stage salutation signal write drafts.", runtime.curator);
  const search = global.window.AIDA_CRAWLER.search("LLM refinement lane");
  assert(search.results.length >= 1, "Crawler did not find LLM refinement memory.", search);

  return {
    packetId: packet.id,
    status: distillation.status,
    method: distillation.method,
    llmStatus: distillation.llm.status,
    fallbackStatus: distillation.fallback.status,
    diaryDrafts: distillation.diaryDrafts.length,
    factCandidates: distillation.factCandidates.length,
    sensitiveContextCandidates: distillation.sensitiveContextCandidates.length,
    salutationSignals: distillation.salutationSignals.length,
    preferredSource: preferred.source,
    preferredMethod: preferred.method,
    librarianDiaryDrafts: runtime.librarian.diaryDrafts.length,
    librarianProjectDrafts: runtime.librarian.projectBriefcaseDrafts.length,
    curatorProjectListings: runtime.curator.projectListingDrafts.length,
    curatorWritePlans: runtime.curator.writePlanDrafts.length,
    crawlerEntries: runtime.crawler.entries.length,
    crawlerSearchResults: search.results.length
  };
}

async function runLlmJsonRepairTest() {
  const turns = [
    makeTurn(
      1,
      "Please repair malformed LLM sleep JSON if the first response is invalid.",
      "I will ask for a strict JSON repair before falling back."
    )
  ];
  const runtime = makeRuntime(turns, {}, { llmReady: true });
  const sleep = loadSleepCycle(runtime, { mockOpenAI: true, mockMalformedOpenAI: true });
  const packet = sleep.buildPacket("smoke_llm_json_repair");
  const distillation = await sleep.refinePacketWithLlm(packet);

  assert(distillation.status === "llm_draft_filled", "LLM JSON repair did not recover a refined draft.", distillation);
  assert(distillation.llm?.status === "complete", "LLM JSON repair did not complete.", distillation);
  assert(distillation.llm?.repairAttempted, "LLM JSON repair path was not marked attempted.", distillation);

  return {
    packetId: packet.id,
    status: distillation.status,
    llmStatus: distillation.llm.status,
    repairAttempted: distillation.llm.repairAttempted,
    diaryDrafts: distillation.diaryDrafts.length
  };
}

async function runCompactLlmReviewTest() {
  const turns = [
    makeTurn(
      1,
      "hello my sweet child, please keep sleep summaries compact so I can review before writeback.",
      "I will produce a small memory review and keep fallback shelves available."
    )
  ];
  const runtime = makeRuntime(turns, {}, { llmReady: true });
  const sleep = loadSleepCycle(runtime, { mockOpenAI: true, mockCompactReviewOpenAI: true });
  const packet = sleep.buildPacket("smoke_compact_llm_review");
  const distillation = await sleep.refinePacketWithLlm(packet);
  const preferred = sleep.getPreferredDistillation(packet);

  assert(distillation.status === "llm_draft_filled", "Compact LLM review did not fill distillation.", distillation);
  assert(preferred.source === "llm", "Compact LLM review did not become preferred.", preferred);
  assert(distillation.llm?.passCount === 3, "Compact LLM review should run three staged passes.", distillation.llm);
  assert(distillation.llm?.completedPasses === 3, "Compact LLM review should complete all staged passes.", distillation.llm);
  assert(distillation.diaryDrafts[0]?.entry.includes("compact memory review"), "Compact diaryEntry was not normalized.", distillation.diaryDrafts);
  assert(distillation.rollingSummaries[0]?.text.includes("compact review"), "Compact sessionSummary was not normalized.", distillation.rollingSummaries);
  assert(distillation.longSummaryCandidates[0]?.text.includes("LLM-first memory review"), "Compact longSummary was not normalized.", distillation.longSummaryCandidates);
  assert(distillation.factCandidates.length === 1, "Compact durableFacts were not normalized.", distillation.factCandidates);
  assert(distillation.insightCandidates.length === 1, "Compact behaviorInsights were not normalized.", distillation.insightCandidates);
  assert(distillation.salutationSignals.length === 1, "Compact toneSignals were not normalized.", distillation.salutationSignals);
  assert(distillation.processingBacklog.length === 0, "Compact complete review should clear fallback backlog.", distillation.processingBacklog);

  return {
    packetId: packet.id,
    status: distillation.status,
    llmStatus: distillation.llm.status,
    passCount: distillation.llm.passCount,
    completedPasses: distillation.llm.completedPasses,
    diaryDrafts: distillation.diaryDrafts.length,
    rollingSummaries: distillation.rollingSummaries.length,
    longSummaryCandidates: distillation.longSummaryCandidates.length,
    factCandidates: distillation.factCandidates.length,
    insightCandidates: distillation.insightCandidates.length,
    salutationSignals: distillation.salutationSignals.length,
    processingBacklog: distillation.processingBacklog.length
  };
}

async function runMemoryRoutingGuardrailTest() {
  const turns = [
    makeTurn(
      1,
      "I need to pick up my mom at the airport. She lives in Kansas City.",
      "I hope the airport pickup goes smoothly."
    )
  ];
  const runtime = makeRuntime(turns, {}, { llmReady: true });
  const sleep = loadSleepCycle(runtime, { mockOpenAI: true, mockMemoryRoutingReviewOpenAI: true });
  const packet = sleep.buildPacket("smoke_memory_routing_guardrail");
  const distillation = await sleep.refinePacketWithLlm(packet);

  assert(distillation.factCandidates.length === 1, "Temporary logistics should not remain a durable fact.", distillation.factCandidates);
  assert(
    distillation.factCandidates[0]?.claim === "Francisco's mother lives in Kansas City.",
    "The stable residence detail should remain a durable fact candidate.",
    distillation.factCandidates
  );
  assert(distillation.openThreads.length === 1, "Temporary airport logistics should become an open thread.", distillation.openThreads);
  assert(
    distillation.openThreads[0]?.thread.includes("pick up his mom at the airport"),
    "The airport pickup follow-up was not preserved.",
    distillation.openThreads
  );
  assert(
    distillation.openThreads[0]?.expiresAt,
    "Rerouted temporary facts should receive an expiration timestamp.",
    distillation.openThreads
  );
  assert(
    distillation.sensitiveContextCandidates.length === 0,
    "Ordinary tiredness and airport logistics should not become sensitive caregiving context.",
    distillation.sensitiveContextCandidates
  );

  return {
    packetId: packet.id,
    factCandidates: distillation.factCandidates.map((item) => item.claim),
    openThreads: distillation.openThreads.map((item) => item.thread),
    sensitiveContextCandidates: distillation.sensitiveContextCandidates.length
  };
}

async function runPartialStagedLlmPassTest() {
  const turns = [
    makeTurn(
      1,
      "hello my sweet child, if one sleep pass fails, keep the other LLM shelves and fallback the rest.",
      "I will merge successful staged passes and leave failed shelves safe."
    )
  ];
  const runtime = makeRuntime(turns, {}, { llmReady: true });
  const sleep = loadSleepCycle(runtime, { mockOpenAI: true, mockCompactReviewOpenAI: true, mockFailedSemanticPassOpenAI: true });
  const packet = sleep.buildPacket("smoke_partial_staged_llm_pass");
  const fallbackBacklogCount = packet.distillation.processingBacklog.length;
  const distillation = await sleep.refinePacketWithLlm(packet);
  const preferred = sleep.getPreferredDistillation(packet);

  assert(distillation.status === "llm_draft_filled", "Partial staged LLM should still fill distillation.", distillation);
  assert(distillation.llm?.status === "partial", "Partial staged LLM should mark llm status partial.", distillation.llm);
  assert(distillation.llm?.completedPasses === 2, "Partial staged LLM should complete two passes.", distillation.llm);
  assert(distillation.llm?.failedPasses === 1, "Partial staged LLM should record one failed pass.", distillation.llm);
  assert(preferred.source === "llm", "Partial staged LLM should still prefer merged LLM shelves.", preferred);
  assert(distillation.diaryDrafts[0]?.entry.includes("compact memory review"), "Continuity pass result was not kept.", distillation.diaryDrafts);
  assert(distillation.salutationSignals.length === 1, "Relationship pass result was not kept.", distillation.salutationSignals);
  assert(distillation.factCandidates.length === 0, "Failed semantic pass should not stage fact candidates.", distillation.factCandidates);
  assert(distillation.insightCandidates.length === 0, "Failed semantic pass should not stage insight candidates.", distillation.insightCandidates);
  assert(distillation.processingBacklog.length === fallbackBacklogCount, "Failed semantic pass should preserve fallback backlog.", distillation.processingBacklog);

  return {
    packetId: packet.id,
    status: distillation.status,
    llmStatus: distillation.llm.status,
    completedPasses: distillation.llm.completedPasses,
    failedPasses: distillation.llm.failedPasses,
    diaryDrafts: distillation.diaryDrafts.length,
    factCandidates: distillation.factCandidates.length,
    insightCandidates: distillation.insightCandidates.length,
    salutationSignals: distillation.salutationSignals.length,
    processingBacklog: distillation.processingBacklog.length
  };
}

async function runPartialLlmMergeTest() {
  const turns = [
    makeTurn(
      1,
      "hello my sweet child, preserve fallback shelves when LLM only returns a diary.",
      "I will not let a partial LLM draft erase useful fallback scaffolding."
    )
  ];
  const runtime = makeRuntime(turns, {}, { llmReady: true });
  const sleep = loadSleepCycle(runtime, { mockOpenAI: true, mockPartialOpenAI: true });
  const packet = sleep.buildPacket("smoke_partial_llm_merge");
  const fallbackCounts = { ...packet.distillation.counts };
  const distillation = await sleep.refinePacketWithLlm(packet);

  assert(distillation.status === "llm_draft_filled", "Partial LLM merge did not keep LLM status.", distillation);
  assert(distillation.diaryDrafts[0]?.id === "diary_partial_llm_smoke", "Partial LLM diary was not applied.", distillation);
  assert(distillation.rollingSummaries.length === fallbackCounts.diaryDrafts, "Partial LLM merge did not preserve fallback rolling summaries.", distillation);
  assert(distillation.longSummaryCandidates.length === fallbackCounts.diaryDrafts, "Partial LLM merge did not preserve fallback long summaries.", distillation);
  assert(distillation.salutationSignals.length >= 1, "Partial LLM merge did not preserve fallback salutation signals.", distillation);
  assert(distillation.processingBacklog.length >= 1, "Partial LLM merge did not preserve backlog for missing semantic memory.", distillation);
  assert(distillation.mergeNotes?.keptProcessingBacklog, "Partial LLM merge did not mark backlog preservation.", distillation);
  const preferred = sleep.getPreferredDistillation(packet);
  assert(preferred.mergeNotes?.usedFallbackRollingSummaries, "Preferred distillation did not expose fallback summary provenance.", preferred);
  assert(runtime.librarian?.projectBriefcaseDrafts?.length >= 1, "Partial LLM did not stage a project briefcase draft.", runtime.librarian);
  const projectDraft = runtime.librarian.projectBriefcaseDrafts[runtime.librarian.projectBriefcaseDrafts.length - 1];
  assert(
    projectDraft.update.latest_summary === distillation.diaryDrafts[0].entry,
    "Partial LLM project summary should use the LLM diary instead of fallback rolling summary.",
    projectDraft
  );
  assert(
    !String(projectDraft.update.latest_summary || "").startsWith("Across "),
    "Partial LLM project summary leaked deterministic fallback prose.",
    projectDraft
  );
  assert(projectDraft.update.rolling_summary_ids.length === 0, "Fallback rolling summary ids should not be written as LLM project summary ids.", projectDraft);

  return {
    packetId: packet.id,
    status: distillation.status,
    diaryDrafts: distillation.diaryDrafts.length,
    rollingSummaries: distillation.rollingSummaries.length,
    longSummaryCandidates: distillation.longSummaryCandidates.length,
    salutationSignals: distillation.salutationSignals.length,
    processingBacklog: distillation.processingBacklog.length,
    keptProcessingBacklog: distillation.mergeNotes.keptProcessingBacklog,
    projectSummary: projectDraft.update.latest_summary
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
    assert(fs.existsSync(crawlerPath), `Missing crawler source: ${crawlerPath}`);
    assert(fs.existsSync(llmMessagesPath), `Missing LLM message source: ${llmMessagesPath}`);
    assert(fs.existsSync(driveWritebackPath), `Missing Drive writeback source: ${driveWritebackPath}`);
    const result = {
      status: "pass",
      startedAt,
      finishedAt: new Date().toISOString(),
      source: sleepCyclePath,
      tests: {
        oneTurnFallback: runOneTurnFallbackTest(),
        chunkDraft: runChunkDraftTest(),
        freshCollectionBoundary: runFreshCollectionBoundaryTest(),
        llmRefinement: await runLlmRefinementTest(),
        llmJsonRepair: await runLlmJsonRepairTest(),
        compactLlmReview: await runCompactLlmReviewTest(),
        memoryRoutingGuardrail: await runMemoryRoutingGuardrailTest(),
        partialStagedLlmPass: await runPartialStagedLlmPassTest(),
        partialLlmMerge: await runPartialLlmMergeTest(),
        crashBufferRestore: runCrashBufferRestoreTest(),
        memoryBoundary: runMemoryBoundaryMessageTest(),
        driveBackedLibrarian: runDriveBackedLibrarianTest(),
        multimodalMessages: runMultimodalMessageShapeTest(),
        driveWritebackDryRun: await runDriveWritebackDryRunTest()
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
