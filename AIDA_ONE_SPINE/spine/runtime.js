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
