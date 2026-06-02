(function () {
  const MODULE_ID = "spine.session.capture";

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function log(message, className = "log-green") {
    if (window.AIDA_BIOS?.log) {
      window.AIDA_BIOS.log(message, className);
    }
  }

  function valueName(value, fallback = "unnamed") {
    if (!value || typeof value !== "object") return fallback;
    const direct = (
      value.name ||
      value.display_name ||
      value.displayName ||
      value.realm_name ||
      value.role_name ||
      value.identity_name ||
      value.project_name ||
      value.briefcase_title ||
      value.briefcase_id ||
      value.title ||
      value.label ||
      value.id ||
      value.filename ||
      value.briefcase_name ||
      null
    );
    if (direct) return String(direct);

    for (const key of ["identity", "realm", "role", "project", "briefcase"]) {
      const nested = value[key];
      if (nested && typeof nested === "object") {
        const nestedName = valueName(nested, "");
        if (nestedName) return nestedName;
      }
    }

    return fallback;
  }

  function emotionSnapshot(emotion) {
    if (!emotion || typeof emotion !== "object") {
      return {
        label: "missing",
        valence: null,
        arousal: null
      };
    }

    return {
      label: emotion.label || emotion.emotion || emotion.state || "unlabeled",
      valence: emotion.valence ?? emotion.v ?? null,
      arousal: emotion.arousal ?? emotion.a ?? null
    };
  }

  function ensureSession() {
    const rt = runtime();
    if (!rt.session) {
      rt.session = {
        id: null,
        startedAt: null,
        lastTurnAt: null,
        currentTurns: [],
        unsaved: false,
        exchangeCount: 0,
        logRefs: []
      };
    }

    if (!rt.session.id) {
      const stamp = new Date().toISOString();
      rt.session.id = `session_${stamp.replace(/[-:.TZ]/g, "").slice(0, 14)}`;
      rt.session.startedAt = stamp;
      rt.session.currentTurns = [];
      rt.session.unsaved = false;
      rt.session.exchangeCount = 0;
      rt.session.logRefs = [];
      log(`SESSION: Started ${rt.session.id}.`, "log-blue");
    }

    return rt.session;
  }

  function contextSnapshot() {
    const rt = runtime();
    const context = rt.context || {};
    const mind = rt.mind || {};
    const realm = context.realm || mind.realm;
    const role = context.role || mind.role;
    const project = context.project || mind.activeProject;
    const emotion = context.emotion || mind.emotion;

    return {
      identity: valueName(context.identity || mind.identity, "unknown_identity"),
      realm: valueName(realm, "unknown_realm"),
      project: project
        ? valueName(project, "unknown_project")
        : `realm_as_project: ${valueName(realm, "unknown_realm")}`,
      projectMode: context.projectMode || (project ? "briefcase" : "realm_as_project_placeholder"),
      role: valueName(role, "unknown_role"),
      emotion: emotionSnapshot(emotion),
      route: {
        provider: rt.tokens?.llm?.provider || "none",
        profile: rt.tokens?.llm?.profile || "none"
      },
      llm: {
        responseId: rt.context?.lastLlmResponse?.responseId || null,
        model: rt.context?.lastLlmResponse?.model || null
      }
    };
  }

  function captureExchange(userText, aidaText) {
    const rt = runtime();
    const session = ensureSession();
    const now = new Date().toISOString();
    const turnIndex = session.currentTurns.length + 1;
    const snapshot = contextSnapshot();

    const exchange = {
      turnIndex,
      capturedAt: now,
      user: {
        role: "user",
        text: userText
      },
      aida: {
        role: "assistant",
        text: aidaText
      },
      context: snapshot
    };

    session.currentTurns.push(exchange);
    session.exchangeCount = session.currentTurns.length;
    session.lastTurnAt = now;
    session.unsaved = true;
    rt.sleep.pendingJournal = rt.sleep.pendingJournal || [];
    rt.sleep.pendingJournal.push({
      type: "exchange",
      sessionId: session.id,
      turnIndex,
      capturedAt: now
    });

    log(`SESSION: Captured exchange ${turnIndex}. unsaved=true.`, "log-blue");
    return exchange;
  }

  function safeSummary() {
    const session = ensureSession();
    return {
      id: session.id,
      startedAt: session.startedAt,
      lastTurnAt: session.lastTurnAt,
      exchangeCount: session.exchangeCount || 0,
      unsaved: Boolean(session.unsaved),
      pendingJournalCount: runtime().sleep?.pendingJournal?.length || 0
    };
  }

  function install() {
    ensureSession();
    log("Session capture organ loaded. Memory writes are still disabled.", "log-blue");
  }

  window.AIDA_SESSION_CAPTURE = {
    ensureSession,
    captureExchange,
    safeSummary
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "session_capture",
      reads: ["AIDA_RUNTIME.context", "AIDA_RUNTIME.tokens.llm", "AIDA_RUNTIME.context.lastLlmResponse"],
      writes: ["AIDA_RUNTIME.session.currentTurns", "AIDA_RUNTIME.session.unsaved", "AIDA_RUNTIME.sleep.pendingJournal"],
      requires: ["AIDA_RUNTIME"],
      verifies: ["completed exchanges are captured in memory without Drive writes"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
