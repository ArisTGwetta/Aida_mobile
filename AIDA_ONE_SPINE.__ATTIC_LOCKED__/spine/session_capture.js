// AIDA REVIEW BLOCK 1: File header - AIDA_ONE_SPINE\spine\session_capture.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
(function () {
  const MODULE_ID = "spine.session.capture";

// AIDA REVIEW BLOCK 3: Function runtime - callable behavior in this runtime organ.
  function runtime() {
    return window.AIDA_RUNTIME;
  }

// AIDA REVIEW BLOCK 4: Function log - callable behavior in this runtime organ.
  function log(message, className = "log-green") {
    if (window.AIDA_BIOS?.log) {
      window.AIDA_BIOS.log(message, className);
    }
  }

// AIDA REVIEW BLOCK 5: Function valueName - callable behavior in this runtime organ.
  function valueName(value, fallback = "unnamed") {
    if (!value || typeof value !== "object") return fallback;
// AIDA REVIEW BLOCK 6: Function direct - arrow-function behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 7: Function emotionSnapshot - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 8: Function cleanTag - callable behavior in this runtime organ.
  function cleanTag(value, fallback = "unknown") {
    return String(value || fallback)
      .trim()
      .replace(/\s+/g, "_")
      .toLowerCase();
  }

// AIDA REVIEW BLOCK 9: Function cleanCustomTags - callable behavior in this runtime organ.
  function cleanCustomTags(tags) {
    if (!Array.isArray(tags)) return [];
    return [...new Set(tags.map((tag) => cleanTag(tag, "")).filter(Boolean))];
  }

// AIDA REVIEW BLOCK 10: Function ensureSession - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 11: Function contextSnapshot - callable behavior in this runtime organ.
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
      profile: rt.tokens?.llm?.profile || "none",
      model: rt.tokens?.llm?.model || rt.context?.lastLlmResponse?.model || null
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
        provider: route.provider,
        profile: route.profile,
        responseId: rt.context?.lastLlmResponse?.responseId || null,
        model: route.model
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
      llm_provider: cleanTag(route.provider, "none"),
      llm_profile: cleanTag(route.profile, "none"),
      llm_model: cleanTag(route.model || "unknown_model"),
      llm_scope: cleanTag(route.provider, "shared"),
      source: "awake",
      custom: customTags
    };

    return snapshot;
  }

// AIDA REVIEW BLOCK 12: Function captureExchange - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 13: Function safeSummary - callable behavior in this runtime organ.
  function safeSummary() {
    const session = ensureSession();
    const lastExchange = session.currentTurns?.[session.currentTurns.length - 1] || null;
// AIDA REVIEW BLOCK 14: Function tagTrail - arrow-function behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 15: Function inspectSession - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 16: Function install - callable behavior in this runtime organ.
  function install() {
    const button = document.getElementById("session-inspect-btn");
    if (button) button.addEventListener("click", inspectSession);
    ensureSession();
    log("Session capture organ loaded. Memory writes are still disabled.", "log-blue");
  }

// AIDA REVIEW BLOCK 17: Browser export AIDA_SESSION_CAPTURE - exposes this organ to the page runtime.
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

// AIDA REVIEW BLOCK 18: Browser event wiring - connects page lifecycle or user actions to this organ.
  document.addEventListener("DOMContentLoaded", install);
})();
