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

  function cleanTag(value, fallback = "unknown") {
    return String(value || fallback)
      .trim()
      .replace(/\s+/g, "_")
      .toLowerCase();
  }

  function cleanCustomTags(tags) {
    if (!Array.isArray(tags)) return [];
    return [...new Set(tags.map((tag) => cleanTag(tag, "")).filter(Boolean))];
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
    const projectFile = context.projectName || mind.activeProjectName || null;
    const projectName = project
      ? valueName(project, "unknown_project")
      : `realm_as_project: ${valueName(realm, "unknown_realm")}`;
    const roleName = valueName(role, "unknown_role");
    const emotionState = emotionSnapshot(emotion);
    const route = {
      provider: rt.tokens?.llm?.provider || "none",
      profile: rt.tokens?.llm?.profile || "none"
    };
    const customTags = cleanCustomTags(context.customTags || []);

    const snapshot = {
      identity: valueName(context.identity || mind.identity, "unknown_identity"),
      realm: valueName(realm, "unknown_realm"),
      project: projectName,
      projectFile,
      projectMode: context.projectMode || (project ? "briefcase" : "realm_as_project_placeholder"),
      role: roleName,
      roleSource: context.roleSource || null,
      emotion: emotionState,
      route,
      customTags,
      llm: {
        responseId: rt.context?.lastLlmResponse?.responseId || null,
        model: rt.context?.lastLlmResponse?.model || null
      }
    };

    snapshot.tags = {
      session_id: rt.session?.id || "pending_session",
      identity: cleanTag(snapshot.identity),
      realm: cleanTag(snapshot.realm),
      project: cleanTag(projectName),
      project_file: cleanTag(projectFile || "none"),
      project_mode: cleanTag(snapshot.projectMode),
      role: cleanTag(roleName),
      role_source: cleanTag(context.roleSource || "unknown_role_source"),
      emotion: cleanTag(emotionState.label, "unknown_emotion"),
      llm_route: cleanTag(`${route.provider}_${route.profile}`),
      source: "awake",
      custom: customTags
    };

    return snapshot;
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
      context: snapshot,
      tags: {
        ...snapshot.tags,
        turn_index: String(turnIndex),
        captured_at: now
      }
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
      capturedAt: now,
      tags: exchange.tags
    });

    if (window.AIDA_CONTEXT_EVOLUTION?.ingest) {
      window.AIDA_CONTEXT_EVOLUTION.ingest(exchange);
    }
    if (window.AIDA_CRASH_BUFFER?.checkpoint) {
      window.AIDA_CRASH_BUFFER.checkpoint("exchange_captured");
    }

    log(`SESSION: Captured exchange ${turnIndex}. unsaved=true.`, "log-blue");
    return exchange;
  }

  function safeSummary() {
    const session = ensureSession();
    const lastExchange = session.currentTurns?.[session.currentTurns.length - 1] || null;
    const tagTrail = (session.currentTurns || []).map((exchange) => ({
      turnIndex: exchange.turnIndex,
      realm: exchange.tags?.realm || "none",
      project: exchange.tags?.project || "none",
      role: exchange.tags?.role || "none",
      custom: exchange.tags?.custom || []
    }));

    return {
      id: session.id,
      startedAt: session.startedAt,
      lastTurnAt: session.lastTurnAt,
      exchangeCount: session.exchangeCount || 0,
      unsaved: Boolean(session.unsaved),
      pendingJournalCount: runtime().sleep?.pendingJournal?.length || 0,
      tagTrail,
      lastExchange: lastExchange
        ? {
            turnIndex: lastExchange.turnIndex,
            capturedAt: lastExchange.capturedAt,
            userChars: lastExchange.user?.text?.length || 0,
            aidaChars: lastExchange.aida?.text?.length || 0,
            identity: lastExchange.context?.identity || "unknown_identity",
            realm: lastExchange.context?.realm || "unknown_realm",
            project: lastExchange.context?.project || "unknown_project",
            projectFile: lastExchange.context?.projectFile || "none",
            role: lastExchange.context?.role || "unknown_role",
            roleSource: lastExchange.context?.roleSource || "unknown_role_source",
            emotion: lastExchange.context?.emotion?.label || "unknown_emotion",
            route: `${lastExchange.context?.route?.provider || "none"}/${lastExchange.context?.route?.profile || "none"}`,
            model: lastExchange.context?.llm?.model || "unknown_model",
            customTags: lastExchange.context?.customTags || [],
            tags: lastExchange.tags || {}
          }
        : null
    };
  }

  function inspectSession() {
    const summary = safeSummary();
    log("SESSION: Safe capture summary follows.", "log-blue");
    log(`SESSION: id=${summary.id}, exchanges=${summary.exchangeCount}, unsaved=${summary.unsaved}, pendingJournal=${summary.pendingJournalCount}`);
    log(`SESSION: started=${summary.startedAt || "n/a"}, lastTurn=${summary.lastTurnAt || "n/a"}`);

    if (summary.tagTrail.length) {
      const trail = summary.tagTrail
        .map((turn) => {
          const custom = Array.isArray(turn.custom) && turn.custom.length ? turn.custom.join("+") : "none";
          return `${turn.turnIndex}:${turn.realm}/${turn.role}/custom=${custom}`;
        })
        .join(" | ");
      log(`SESSION TAG TRAIL: ${trail}`);
    }

    if (!summary.lastExchange) {
      log("SESSION LAST: none captured yet.", "log-amber");
      return summary;
    }

    const last = summary.lastExchange;
    log(`SESSION LAST: turn=${last.turnIndex}, userChars=${last.userChars}, aidaChars=${last.aidaChars}`);
    log(`SESSION LAST CONTEXT: identity=${last.identity}, realm=${last.realm}, project=${last.project}, projectFile=${last.projectFile}, role=${last.role}, roleSource=${last.roleSource}`);
    log(`SESSION LAST STATE: emotion=${last.emotion}, route=${last.route}, model=${last.model}`);
    log(`SESSION LAST TAGS: realm=${last.tags.realm || "none"}, project=${last.tags.project || "none"}, role=${last.tags.role || "none"}, custom=${(last.customTags || []).join(",") || "none"}`);
    if (window.AIDA_CONTEXT_EVOLUTION?.safeSummary) {
      const evolution = window.AIDA_CONTEXT_EVOLUTION.safeSummary();
      log(`SESSION EVOLUTION: queued=${evolution.queuedCount}, pending=${evolution.pendingSummaryCount}, drafts=${evolution.summaryDraftCount}, needsLlm=${evolution.needsLlmSummaryCount}, ledgerDrafts=${evolution.projectLedgerDraftCount}, lastQueuedTurn=${evolution.lastQueuedTurn}`);
    }
    return summary;
  }

  function install() {
    const button = document.getElementById("session-inspect-btn");
    if (button) button.addEventListener("click", inspectSession);
    ensureSession();
    log("Session capture organ loaded. Memory writes are still disabled.", "log-blue");
  }

  window.AIDA_SESSION_CAPTURE = {
    ensureSession,
    captureExchange,
    safeSummary,
    inspectSession
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "session_capture",
      reads: ["AIDA_RUNTIME.context", "AIDA_RUNTIME.tokens.llm", "AIDA_RUNTIME.context.lastLlmResponse"],
      writes: ["AIDA_RUNTIME.session.currentTurns", "AIDA_RUNTIME.session.unsaved", "AIDA_RUNTIME.sleep.pendingJournal"],
      requires: ["AIDA_RUNTIME"],
      verifies: ["completed exchanges are captured with sleep-friendly tags and offered to context evolution without Drive writes"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
