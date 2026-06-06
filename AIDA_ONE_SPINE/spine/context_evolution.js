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
        summaryDrafts: [],
        projectLedgerDrafts: [],
        rollingSummaries: [],
        longSummaryDrafts: []
      };
    }

    rt.contextEvolution.queuedChunks = rt.contextEvolution.queuedChunks || [];
    rt.contextEvolution.summaryDrafts = rt.contextEvolution.summaryDrafts || [];
    rt.contextEvolution.projectLedgerDrafts = rt.contextEvolution.projectLedgerDrafts || [];
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
      prepareSummaryDrafts();
    }

    return queued;
  }

  function ingest() {
    return maybeQueueReadyChunks();
  }

  function draftExists(state, chunkId) {
    return (state.summaryDrafts || []).some((draft) => draft.chunkId === chunkId);
  }

  function ledgerDraftExists(state, summaryDraftId) {
    return (state.projectLedgerDrafts || []).some((draft) => draft.sourceSummaryDraftId === summaryDraftId);
  }

  function buildSummaryDraft(chunk) {
    return {
      id: `${chunk.id}_summary_draft`,
      chunkId: chunk.id,
      status: "needs_llm_summary",
      createdAt: new Date().toISOString(),
      sessionId: chunk.sessionId,
      turnStart: chunk.turnStart,
      turnEnd: chunk.turnEnd,
      exchangeCount: chunk.exchangeCount,
      charCount: chunk.charCount,
      tags: chunk.tags,
      prompts: {
        rolling: "Summarize the local conversational flow and immediate continuity for the active project.",
        long: "Extract durable project memory candidates, open loops, decisions, and user preferences.",
        diary: "Capture the reflective emotional shape of this chunk without inventing events outside the session."
      },
      outputs: {
        rolling_summary: null,
        long_summary_candidate: null,
        diary_candidate: null,
        fact_candidates: [],
        insight_candidates: [],
        open_threads: []
      },
      preview: chunk.preview
    };
  }

  function prepareSummaryDrafts() {
    const rt = runtime();
    const state = ensureState();
    let prepared = 0;

    (state.queuedChunks || []).forEach((chunk) => {
      if (chunk.status !== "ready_for_summary") return;
      if (draftExists(state, chunk.id)) return;

      const draft = buildSummaryDraft(chunk);
      state.summaryDrafts.push(draft);
      chunk.status = "summary_draft_prepared";
      rt.sleep.pendingJournal = rt.sleep.pendingJournal || [];
      rt.sleep.pendingJournal.push({
        type: "summary_draft",
        sessionId: draft.sessionId,
        chunkId: draft.chunkId,
        draftId: draft.id,
        status: draft.status,
        createdAt: draft.createdAt,
        tags: draft.tags
      });
      prepared += 1;
    });

    if (prepared) {
      log(`EVOLUTION: Prepared ${prepared} summary draft(s). LLM summarization still disabled.`, "log-blue");
      prepareProjectLedgerDrafts();
    }

    return prepared;
  }

  function buildProjectLedgerDraft(summaryDraft) {
    const tags = summaryDraft.tags || {};
    return {
      id: `${summaryDraft.id}_project_ledger_draft`,
      sourceSummaryDraftId: summaryDraft.id,
      sourceChunkId: summaryDraft.chunkId,
      status: "needs_summary_outputs",
      createdAt: new Date().toISOString(),
      project: {
        name: tags.project || "unknown_project",
        file: tags.project_file || "none",
        mode: tags.project_mode || "unknown_project_mode",
        realm: tags.realm || "unknown_realm",
        role: tags.role || "unknown_role",
        role_source: tags.role_source || "unknown_role_source"
      },
      update: {
        latest_summary: null,
        latest_status: null,
        open_threads: [],
        facts_to_consider: [],
        insights_to_consider: [],
        emotional_notes: [],
        while_away_seed: null,
        last_active: summaryDraft.createdAt
      },
      tags
    };
  }

  function prepareProjectLedgerDrafts() {
    const rt = runtime();
    const state = ensureState();
    let prepared = 0;

    (state.summaryDrafts || []).forEach((summaryDraft) => {
      if (summaryDraft.status !== "needs_llm_summary") return;
      if (ledgerDraftExists(state, summaryDraft.id)) return;

      const ledgerDraft = buildProjectLedgerDraft(summaryDraft);
      state.projectLedgerDrafts.push(ledgerDraft);
      rt.sleep.pendingJournal = rt.sleep.pendingJournal || [];
      rt.sleep.pendingJournal.push({
        type: "project_ledger_draft",
        sessionId: summaryDraft.sessionId,
        summaryDraftId: summaryDraft.id,
        ledgerDraftId: ledgerDraft.id,
        status: ledgerDraft.status,
        createdAt: ledgerDraft.createdAt,
        tags: ledgerDraft.tags
      });
      prepared += 1;
    });

    if (prepared) {
      log(`EVOLUTION: Prepared ${prepared} project ledger draft(s). Drive writes still disabled.`, "log-blue");
    }

    return prepared;
  }

  function safeSummary() {
    const state = ensureState();
    const chunks = state.queuedChunks || [];
    const drafts = state.summaryDrafts || [];
    const ledgerDrafts = state.projectLedgerDrafts || [];
    const last = chunks[chunks.length - 1] || null;
    const lastDraft = drafts[drafts.length - 1] || null;
    const lastLedgerDraft = ledgerDrafts[ledgerDrafts.length - 1] || null;
    return {
      turnThreshold: state.turnThreshold,
      charThreshold: state.charThreshold,
      lastQueuedTurn: state.lastQueuedTurn || 0,
      queuedCount: chunks.length,
      pendingSummaryCount: chunks.filter((chunk) => chunk.status === "ready_for_summary").length,
      summaryDraftCount: drafts.length,
      needsLlmSummaryCount: drafts.filter((draft) => draft.status === "needs_llm_summary").length,
      projectLedgerDraftCount: ledgerDrafts.length,
      needsLedgerOutputCount: ledgerDrafts.filter((draft) => draft.status === "needs_summary_outputs").length,
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
        : null,
      lastDraft: lastDraft
        ? {
            id: lastDraft.id,
            chunkId: lastDraft.chunkId,
            status: lastDraft.status,
            realm: lastDraft.tags?.realm || "unknown_realm",
            project: lastDraft.tags?.project || "unknown_project",
            role: lastDraft.tags?.role || "unknown_role",
            custom: lastDraft.tags?.custom || []
          }
        : null,
      lastLedgerDraft: lastLedgerDraft
        ? {
            id: lastLedgerDraft.id,
            sourceSummaryDraftId: lastLedgerDraft.sourceSummaryDraftId,
            status: lastLedgerDraft.status,
            project: lastLedgerDraft.project?.name || "unknown_project",
            realm: lastLedgerDraft.project?.realm || "unknown_realm",
            role: lastLedgerDraft.project?.role || "unknown_role"
          }
        : null
    };
  }

  function inspect() {
    const summary = safeSummary();
    log("EVOLUTION: Safe summary follows.", "log-blue");
    log(`EVOLUTION: queued=${summary.queuedCount}, pending=${summary.pendingSummaryCount}, drafts=${summary.summaryDraftCount}, needsLlm=${summary.needsLlmSummaryCount}, ledgerDrafts=${summary.projectLedgerDraftCount}, lastQueuedTurn=${summary.lastQueuedTurn}`);
    log(`EVOLUTION: thresholds turns=${summary.turnThreshold}, chars=${summary.charThreshold}`);
    if (summary.lastChunk) {
      const last = summary.lastChunk;
      log(`EVOLUTION LAST: ${last.id}, turns=${last.turnStart}-${last.turnEnd}, realm=${last.realm}, project=${last.project}, role=${last.role}, custom=${last.custom.join(",") || "none"}`);
    } else {
      log("EVOLUTION LAST: none queued yet.", "log-amber");
    }
    if (summary.lastDraft) {
      const draft = summary.lastDraft;
      log(`EVOLUTION DRAFT: ${draft.id}, status=${draft.status}, realm=${draft.realm}, project=${draft.project}, role=${draft.role}, custom=${draft.custom.join(",") || "none"}`);
    }
    if (summary.lastLedgerDraft) {
      const ledger = summary.lastLedgerDraft;
      log(`EVOLUTION LEDGER DRAFT: ${ledger.id}, status=${ledger.status}, project=${ledger.project}, realm=${ledger.realm}, role=${ledger.role}`);
    }
    return summary;
  }

  window.AIDA_CONTEXT_EVOLUTION = {
    ingest,
    prepareSummaryDrafts,
    prepareProjectLedgerDrafts,
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
      verifies: ["tagged exchanges are grouped into summary-ready chunks and draft summary records without Drive writes"]
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureState();
    log("Context evolution organ loaded. Summary writes are still disabled.", "log-blue");
  });
})();
