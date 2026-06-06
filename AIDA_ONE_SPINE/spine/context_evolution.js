(function () {
  const MODULE_ID = "spine.context.evolution";

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function log(message, className = "log-green") {
    if (window.AIDA_BIOS?.log) {
      window.AIDA_BIOS.log(message, className);
    }
  }

  function ensureState() {
    const rt = runtime();
    if (!rt.contextEvolution) {
      rt.contextEvolution = {
        turnThreshold: 3,
        charThreshold: 2400,
        lastQueuedTurn: 0,
        queuedChunks: [],
        rollingSummaries: [],
        longSummaryDrafts: []
      };
    }

    rt.contextEvolution.queuedChunks = rt.contextEvolution.queuedChunks || [];
    rt.contextEvolution.rollingSummaries = rt.contextEvolution.rollingSummaries || [];
    rt.contextEvolution.longSummaryDrafts = rt.contextEvolution.longSummaryDrafts || [];
    return rt.contextEvolution;
  }

  function primarySignature(exchange) {
    const tags = exchange?.tags || {};
    return [
      tags.realm || "unknown_realm",
      tags.project || "unknown_project",
      tags.project_file || "none",
      tags.role || "unknown_role"
    ].join("|");
  }

  function countChars(exchange) {
    return (exchange?.user?.text?.length || 0) + (exchange?.aida?.text?.length || 0);
  }

  function summarizeTags(turns) {
    const first = turns[0] || {};
    const tags = first.tags || {};
    const custom = new Set();
    turns.forEach((turn) => {
      (turn.tags?.custom || []).forEach((tag) => custom.add(tag));
    });

    return {
      session_id: tags.session_id || runtime().session?.id || "unknown_session",
      realm: tags.realm || "unknown_realm",
      project: tags.project || "unknown_project",
      project_file: tags.project_file || "none",
      project_mode: tags.project_mode || "unknown_project_mode",
      role: tags.role || "unknown_role",
      role_source: tags.role_source || "unknown_role_source",
      emotion: tags.emotion || "unknown_emotion",
      llm_route: tags.llm_route || "unknown_route",
      source: "awake_context_evolution",
      custom: Array.from(custom)
    };
  }

  function textSnippet(text, limit = 280) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, limit);
  }

  function buildChunk(turns) {
    const rt = runtime();
    const chars = turns.reduce((total, turn) => total + countChars(turn), 0);
    const start = turns[0];
    const end = turns[turns.length - 1];
    const tags = summarizeTags(turns);
    const id = `${rt.session?.id || "session"}_chunk_${start.turnIndex}_${end.turnIndex}`;

    return {
      id,
      status: "ready_for_summary",
      createdAt: new Date().toISOString(),
      sessionId: rt.session?.id || null,
      turnStart: start.turnIndex,
      turnEnd: end.turnIndex,
      exchangeCount: turns.length,
      charCount: chars,
      tags,
      summarySlots: {
        rolling: null,
        long: null,
        diary: null
      },
      preview: {
        firstUser: textSnippet(start.user?.text),
        lastUser: textSnippet(end.user?.text),
        lastAida: textSnippet(end.aida?.text)
      }
    };
  }

  function unqueuedGroups(turns, lastQueuedTurn) {
    const candidates = turns.filter((turn) => turn.turnIndex > lastQueuedTurn);
    const groups = [];
    let current = [];
    let currentSignature = null;

    candidates.forEach((turn) => {
      const signature = primarySignature(turn);
      if (current.length && signature !== currentSignature) {
        groups.push(current);
        current = [];
      }
      current.push(turn);
      currentSignature = signature;
    });

    if (current.length) groups.push(current);
    return groups;
  }

  function maybeQueueReadyChunks() {
    const rt = runtime();
    const state = ensureState();
    const session = rt.session || {};
    const turns = session.currentTurns || [];
    const groups = unqueuedGroups(turns, state.lastQueuedTurn || 0);
    let queued = 0;

    groups.forEach((group) => {
      const charCount = group.reduce((total, turn) => total + countChars(turn), 0);
      const ready = group.length >= state.turnThreshold || charCount >= state.charThreshold;
      if (!ready) return;

      const chunk = buildChunk(group);
      state.queuedChunks.push(chunk);
      state.lastQueuedTurn = Math.max(state.lastQueuedTurn || 0, chunk.turnEnd);
      rt.sleep.pendingJournal = rt.sleep.pendingJournal || [];
      rt.sleep.pendingJournal.push({
        type: "context_chunk",
        sessionId: chunk.sessionId,
        chunkId: chunk.id,
        turnStart: chunk.turnStart,
        turnEnd: chunk.turnEnd,
        createdAt: chunk.createdAt,
        tags: chunk.tags
      });
      queued += 1;
    });

    if (queued) {
      log(`EVOLUTION: Queued ${queued} context chunk(s) for sleep summary.`, "log-blue");
    }

    return queued;
  }

  function ingest() {
    return maybeQueueReadyChunks();
  }

  function safeSummary() {
    const state = ensureState();
    const chunks = state.queuedChunks || [];
    const last = chunks[chunks.length - 1] || null;
    return {
      turnThreshold: state.turnThreshold,
      charThreshold: state.charThreshold,
      lastQueuedTurn: state.lastQueuedTurn || 0,
      queuedCount: chunks.length,
      pendingSummaryCount: chunks.filter((chunk) => chunk.status === "ready_for_summary").length,
      rollingSummaryCount: state.rollingSummaries?.length || 0,
      longSummaryDraftCount: state.longSummaryDrafts?.length || 0,
      lastChunk: last
        ? {
            id: last.id,
            turnStart: last.turnStart,
            turnEnd: last.turnEnd,
            exchangeCount: last.exchangeCount,
            realm: last.tags?.realm || "unknown_realm",
            project: last.tags?.project || "unknown_project",
            role: last.tags?.role || "unknown_role",
            custom: last.tags?.custom || []
          }
        : null
    };
  }

  function inspect() {
    const summary = safeSummary();
    log("EVOLUTION: Safe summary follows.", "log-blue");
    log(`EVOLUTION: queued=${summary.queuedCount}, pending=${summary.pendingSummaryCount}, lastQueuedTurn=${summary.lastQueuedTurn}`);
    log(`EVOLUTION: thresholds turns=${summary.turnThreshold}, chars=${summary.charThreshold}`);
    if (summary.lastChunk) {
      const last = summary.lastChunk;
      log(`EVOLUTION LAST: ${last.id}, turns=${last.turnStart}-${last.turnEnd}, realm=${last.realm}, project=${last.project}, role=${last.role}, custom=${last.custom.join(",") || "none"}`);
    } else {
      log("EVOLUTION LAST: none queued yet.", "log-amber");
    }
    return summary;
  }

  window.AIDA_CONTEXT_EVOLUTION = {
    ingest,
    inspect,
    safeSummary
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "context_evolution",
      reads: ["AIDA_RUNTIME.session.currentTurns", "AIDA_RUNTIME.sleep.pendingJournal"],
      writes: ["AIDA_RUNTIME.contextEvolution", "AIDA_RUNTIME.sleep.pendingJournal"],
      requires: ["AIDA_RUNTIME", "AIDA_SESSION_CAPTURE"],
      verifies: ["tagged exchanges are grouped into summary-ready chunks without Drive writes"]
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureState();
    log("Context evolution organ loaded. Summary writes are still disabled.", "log-blue");
  });
})();
