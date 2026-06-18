(function () {
  if (window.AIDA_RUNTIME) return;

  window.AIDA_RUNTIME = {
    version: "spine-0.1",
    boot: {
      phase: "static_load",
      airlockCleared: false,
      driveConnected: false,
      driveLoaded: false,
      pyReady: false,
      mindReady: false,
      arrived: false,
      diagnostics: []
    },
    tokens: {
      openai: { key: null, source: null },
      drive: { accessToken: null, source: null },
      llm: {
        provider: null,
        profile: null,
        key: null,
        source: null
      }
    },
    drive: {
      folderId: null,
      files: {},
      fileIndex: {},
      loadMode: "all_json",
      loadedNames: [],
      deferredNames: [],
      syncQueue: [],
      lastSync: null
    },
    mind: {
      identity: null,
      memory: null,
      facts: null,
      insights: null,
      emotion: null,
      realm: null,
      role: null,
      projects: {},
      projectSummariesIndex: {},
      projectLedger: {},
      activeProject: null,
      activeProjectName: null,
      session: null
    },
    context: {
      identity: null,
      realm: null,
      role: null,
      emotion: null,
      project: null,
      projectName: null,
      projectMode: "no_active_project",
      projectFacts: null,
      projectSummaries: null,
      projectMemory: null,
      projectRecentTurns: null,
      interactionRules: null,
      roleSource: null,
      customTags: [],
      storyInputMode: {
        mode: "francisco",
        label: "FRANCISCO"
      },
      tetrad: null,
      memoryWindow: null,
      llmMessages: null
    },
    session: {
      id: null,
      startedAt: null,
      lastTurnAt: null,
      currentTurns: [],
      unsaved: false,
      exchangeCount: 0,
      logRefs: []
    },
    contextEvolution: {
      turnThreshold: 3,
      charThreshold: 2400,
      lastQueuedTurn: 0,
      queuedChunks: [],
      summaryDrafts: [],
      projectLedgerDrafts: [],
      rollingSummaries: [],
      longSummaryDrafts: []
    },
    crashBuffer: {
      key: "AIDA_SPINE_CRASH_BUFFER_V1",
      lastCheckpointAt: null,
      lastCheckpointReason: null,
      lastRestoredAt: null,
      restored: false,
      available: false,
      error: null
    },
    librarian: {
      lastIngestedPacketId: null,
      lastIngestedAt: null,
      diaryDrafts: [],
      rollingSummaryDrafts: [],
      longSummaryDrafts: [],
      factCandidates: [],
      insightCandidates: [],
      projectBriefcaseDrafts: [],
      ingestLog: []
    },
    curator: {
      lastReviewedAt: null,
      lastReviewedPacketId: null,
      projectListingDrafts: [],
      projectBriefcaseWriteDrafts: [],
      diaryWriteDrafts: [],
      factWriteDrafts: [],
      insightWriteDrafts: [],
      needsConfirmation: [],
      writePlanDrafts: [],
      reviewLog: []
    },
    crawler: {
      key: "AIDA_CRAWLER_INDEX_V1",
      lastIndexedAt: null,
      lastIndexedReason: null,
      entries: [],
      searches: []
    },
    driveWriteback: {
      lastPreviewAt: null,
      lastAppliedAt: null,
      lastStatus: null,
      operations: [],
      history: []
    },
    glasses: {
      attachment: null,
      lastPreparedAt: null,
      lastSentAt: null,
      error: null
    },
    director: {
      enabled: true,
      narrativeMode: "auto",
      activeGame: "serana",
      activeCharacter: null,
      activeExpression: "pensive",
      stageMode: "system",
      lastCueAt: null,
      lastBeats: [],
      privateCandidate: true
    },
    emotionEngine: {
      ready: false,
      lastAppliedAt: null,
      previousLabel: null,
      currentLabel: null,
      currentFace: null,
      currentSource: null,
      history: [],
      snapLog: [],
      faceWishlist: [],
      thresholds: {
        weakSnapDistance: 0.38,
        ambiguousMargin: 0.12
      }
    },
    py: {
      instance: null,
      organsMounted: {},
      ready: false
    },
    body: {
      currentFace: null,
      currentTheme: "awake",
      arrivalComplete: false
    },
    sleep: {
      lastActive: null,
      pendingJournal: [],
      whileAwaySeed: null,
      whileAwayScript: null,
      whileAwaySeeds: [],
      whileAwayTestGap: null,
      lastPacket: null,
      packets: [],
      lastContextCheckpoint: null,
      lastVisibleSummary: null,
      whileAway: {
        ready: false,
        generatedAt: null,
        source: null,
        thought: null,
        topic: null,
        complexity: "small",
        offered: false
      }
    }
  };

  window.AIDA_MODULES = {
    registry: {},
    register(module) {
      if (!module || !module.id) {
        throw new Error("AIDA module registration requires an id.");
      }
      this.registry[module.id] = module;
      return module;
    }
  };
})();
