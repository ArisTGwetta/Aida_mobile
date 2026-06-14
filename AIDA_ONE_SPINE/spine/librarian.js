(function () {
  const MODULE_ID = "spine.librarian";

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function log(message, className = "log-blue") {
    if (window.AIDA_BIOS?.log) {
      window.AIDA_BIOS.log(message, className);
      return;
    }
    if (window.AIDA_BODY?.pulse) window.AIDA_BODY.pulse(message);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function copyJson(value, fallback) {
    if (value === undefined) return fallback;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return fallback;
    }
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function slug(value, fallback = "project") {
    return String(value || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || fallback;
  }

  function consoleReport(label, value) {
    if (typeof console === "undefined" || !console.log) return;
    try {
      console.log(label, copyJson(value, value));
    } catch (error) {
      console.log(label, value);
    }
  }

  function ensureState() {
    const rt = runtime();
    rt.librarian = rt.librarian || {};
    rt.librarian.diaryDrafts = rt.librarian.diaryDrafts || [];
    rt.librarian.rollingSummaryDrafts = rt.librarian.rollingSummaryDrafts || [];
    rt.librarian.longSummaryDrafts = rt.librarian.longSummaryDrafts || [];
    rt.librarian.factCandidates = rt.librarian.factCandidates || [];
    rt.librarian.insightCandidates = rt.librarian.insightCandidates || [];
    rt.librarian.sensitiveContextCandidates = rt.librarian.sensitiveContextCandidates || [];
    rt.librarian.salutationSignals = rt.librarian.salutationSignals || [];
    rt.librarian.rawLogEntries = rt.librarian.rawLogEntries || [];
    rt.librarian.processingBacklog = rt.librarian.processingBacklog || [];
    rt.librarian.projectBriefcaseDrafts = rt.librarian.projectBriefcaseDrafts || [];
    rt.librarian.ingestLog = rt.librarian.ingestLog || [];
    return rt.librarian;
  }

  function upsertById(list, item) {
    if (!item || typeof item !== "object") return;
    const id = item.id || `${item.type || "item"}_${list.length + 1}`;
    const stamped = { ...item, id };
    const index = list.findIndex((existing) => existing?.id === id);
    if (index >= 0) list[index] = stamped;
    else list.push(stamped);
  }

  function isLegacyFallbackCandidate(item) {
    return item?.source === "fallback" || item?.method === "deterministic_runtime_draft";
  }

  function pruneLegacyFallbackCandidates(state) {
    state.factCandidates = safeArray(state.factCandidates).filter((item) => !isLegacyFallbackCandidate(item));
    state.insightCandidates = safeArray(state.insightCandidates).filter((item) => !isLegacyFallbackCandidate(item));
  }

  function projectFromPreferred(preferred) {
    const firstDiary = preferred.output?.diaryDrafts?.[0] || null;
    const firstSummary = preferred.output?.rollingSummaries?.[0] || preferred.output?.longSummaryCandidates?.[0] || null;
    const scope = firstSummary?.scope || "";
    const scopedProject = scope.startsWith("project:") ? scope.slice("project:".length) : null;
    return firstDiary?.project || scopedProject || "unknown_project";
  }

  function realmFromPreferred(preferred) {
    return preferred.output?.diaryDrafts?.[0]?.realm || projectFromPreferred(preferred);
  }

  function buildProjectBriefcaseDraft(preferred, ingestedAt) {
    const project = projectFromPreferred(preferred);
    const realm = realmFromPreferred(preferred);
    const output = preferred.output || {};
    const rolling = safeArray(output.rollingSummaries);
    const long = safeArray(output.longSummaryCandidates);
    const facts = safeArray(output.factCandidates);
    const insights = safeArray(output.insightCandidates);
    const sensitive = safeArray(output.sensitiveContextCandidates);
    const salutations = safeArray(output.salutationSignals);
    const openThreads = safeArray(output.openThreads);
    const existingLedger = safeArray(output.projectLedgerUpdates);

    if (existingLedger.length && preferred.source !== "llm") {
      return existingLedger.map((draft, index) => ({
        ...draft,
        id: draft.id || `project_briefcase_draft_${slug(project)}_${preferred.packetId}_${index + 1}`,
        type: "project_briefcase_update",
        packetId: preferred.packetId,
        source: preferred.source,
        method: preferred.method,
        ingestedAt
      }));
    }

    return [
      {
        id: `project_briefcase_draft_${slug(project)}_${preferred.packetId}`,
        type: "project_briefcase_update",
        packetId: preferred.packetId,
        source: preferred.source,
        method: preferred.method,
        status: "staged",
        project: {
          name: project,
          realm
        },
        update: {
          latest_summary: rolling[0]?.text || null,
          latest_status: long[0]?.text || null,
          rolling_summary_ids: rolling.map((item) => item.id).filter(Boolean),
          long_summary_candidate_ids: long.map((item) => item.id).filter(Boolean),
          open_threads: openThreads,
          facts_to_consider: facts,
          insights_to_consider: insights,
          sensitive_context_to_consider: sensitive,
          salutation_tone_signals: salutations,
          emotional_notes: safeArray(output.diaryDrafts).map((item) => item.emotional_shape).filter(Boolean),
          last_active: preferred.capturedAt || ingestedAt
        },
        ingestedAt
      }
    ];
  }

  function removePacketEntries(state, packetId) {
    if (!packetId) return;
    state.diaryDrafts = state.diaryDrafts.filter((item) => item.packetId !== packetId);
    state.rollingSummaryDrafts = state.rollingSummaryDrafts.filter((item) => item.packetId !== packetId);
    state.longSummaryDrafts = state.longSummaryDrafts.filter((item) => item.packetId !== packetId);
    state.factCandidates = state.factCandidates.filter((item) => item.packetId !== packetId);
    state.insightCandidates = state.insightCandidates.filter((item) => item.packetId !== packetId);
    state.sensitiveContextCandidates = state.sensitiveContextCandidates.filter((item) => item.packetId !== packetId);
    state.salutationSignals = state.salutationSignals.filter((item) => item.packetId !== packetId);
    state.rawLogEntries = state.rawLogEntries.filter((item) => item.packetId !== packetId);
    state.processingBacklog = state.processingBacklog.filter((item) => item.packetId !== packetId);
    state.projectBriefcaseDrafts = state.projectBriefcaseDrafts.filter((item) => item.packetId !== packetId);
  }

  function sourceTurnRange(sourceTurns = []) {
    const turns = safeArray(sourceTurns)
      .map((turn) => Number(turn))
      .filter((turn) => Number.isFinite(turn));
    if (!turns.length) return { turn_start: null, turn_end: null };
    return {
      turn_start: Math.min(...turns),
      turn_end: Math.max(...turns)
    };
  }

  function normalizeDiaryDraft(item, preferred, packet, ingestedAt) {
    const packetSession = packet?.session || {};
    const range = sourceTurnRange(item.source_turns);
    return {
      ...item,
      review_window: item.review_window || {
        session_id: item.session_id || packetSession.id || null,
        turn_start: range.turn_start,
        turn_end: range.turn_end,
        startedAt: packetSession.startedAt || preferred.capturedAt || ingestedAt,
        endedAt: packetSession.lastTurnAt || preferred.capturedAt || ingestedAt,
        source_refs: safeArray(item.source_refs)
      },
      packetId: preferred.packetId,
      source: preferred.source,
      method: preferred.method,
      ingestedAt
    };
  }

  function getStaged() {
    const state = ensureState();
    pruneLegacyFallbackCandidates(state);
    return {
      lastIngestedPacketId: state.lastIngestedPacketId || null,
      lastIngestedAt: state.lastIngestedAt || null,
      diaryDrafts: copyJson(state.diaryDrafts, []),
      rollingSummaryDrafts: copyJson(state.rollingSummaryDrafts, []),
      longSummaryDrafts: copyJson(state.longSummaryDrafts, []),
      factCandidates: copyJson(state.factCandidates, []),
      insightCandidates: copyJson(state.insightCandidates, []),
      sensitiveContextCandidates: copyJson(state.sensitiveContextCandidates, []),
      salutationSignals: copyJson(state.salutationSignals, []),
      rawLogEntries: copyJson(state.rawLogEntries, []),
      processingBacklog: copyJson(state.processingBacklog, []),
      projectBriefcaseDrafts: copyJson(state.projectBriefcaseDrafts, []),
      ingestLog: copyJson(state.ingestLog, [])
    };
  }

  function safeSummary() {
    const state = ensureState();
    pruneLegacyFallbackCandidates(state);
    return {
      ready: Boolean(state.lastIngestedPacketId),
      lastIngestedPacketId: state.lastIngestedPacketId || null,
      lastIngestedAt: state.lastIngestedAt || null,
      diaryDraftCount: state.diaryDrafts.length,
      rollingSummaryDraftCount: state.rollingSummaryDrafts.length,
      longSummaryDraftCount: state.longSummaryDrafts.length,
      factCandidateCount: state.factCandidates.length,
      insightCandidateCount: state.insightCandidates.length,
      sensitiveContextCandidateCount: state.sensitiveContextCandidates.length,
      salutationSignalCount: state.salutationSignals.length,
      rawLogEntryCount: state.rawLogEntries.length,
      processingBacklogCount: state.processingBacklog.length,
      projectBriefcaseDraftCount: state.projectBriefcaseDrafts.length,
      lastProjectDraft: state.projectBriefcaseDrafts[state.projectBriefcaseDrafts.length - 1] || null
    };
  }

  function ingestSleep(packet = runtime()?.sleep?.lastPacket) {
    const state = ensureState();
    pruneLegacyFallbackCandidates(state);
    if (!window.AIDA_SLEEP?.getPreferredDistillation) {
      log("LIBRARIAN: sleep preferred distillation helper is unavailable.", "log-amber");
      return { ready: false, reason: "sleep_helper_unavailable" };
    }

    const preferred = window.AIDA_SLEEP.getPreferredDistillation(packet);
    if (!preferred.ready) {
      log("LIBRARIAN: no preferred sleep distillation ready.", "log-amber");
      return { ready: false, reason: "preferred_distillation_not_ready", preferred };
    }

    const ingestedAt = nowIso();
    const output = preferred.output || {};
    removePacketEntries(state, preferred.packetId);
    safeArray(output.diaryDrafts).forEach((item) => upsertById(state.diaryDrafts, normalizeDiaryDraft(item, preferred, packet, ingestedAt)));
    safeArray(output.rollingSummaries).forEach((item) => upsertById(state.rollingSummaryDrafts, { ...item, packetId: preferred.packetId, source: preferred.source, method: preferred.method, ingestedAt }));
    safeArray(output.longSummaryCandidates).forEach((item) => upsertById(state.longSummaryDrafts, { ...item, packetId: preferred.packetId, source: preferred.source, method: preferred.method, ingestedAt }));
    safeArray(output.factCandidates).forEach((item) => upsertById(state.factCandidates, { ...item, packetId: preferred.packetId, source: preferred.source, method: preferred.method, ingestedAt }));
    safeArray(output.insightCandidates).forEach((item) => upsertById(state.insightCandidates, { ...item, packetId: preferred.packetId, source: preferred.source, method: preferred.method, ingestedAt }));
    safeArray(output.sensitiveContextCandidates).forEach((item) => upsertById(state.sensitiveContextCandidates, { ...item, packetId: preferred.packetId, source: preferred.source, method: preferred.method, ingestedAt }));
    safeArray(output.salutationSignals).forEach((item) => upsertById(state.salutationSignals, { ...item, packetId: preferred.packetId, source: preferred.source, method: preferred.method, ingestedAt }));
    safeArray(output.rawLogEntries).forEach((item) => upsertById(state.rawLogEntries, { ...item, packetId: preferred.packetId, source: preferred.source, method: preferred.method, ingestedAt }));
    safeArray(output.processingBacklog).forEach((item) => upsertById(state.processingBacklog, { ...item, packetId: preferred.packetId, source: preferred.source, method: preferred.method, ingestedAt }));
    buildProjectBriefcaseDraft(preferred, ingestedAt).forEach((item) => upsertById(state.projectBriefcaseDrafts, item));

    state.lastIngestedPacketId = preferred.packetId;
    state.lastIngestedAt = ingestedAt;
    state.ingestLog.push({
      packetId: preferred.packetId,
      source: preferred.source,
      method: preferred.method,
      ingestedAt,
      counts: preferred.counts
    });
    state.ingestLog = state.ingestLog.slice(-20);

    const summary = safeSummary();
    log(`LIBRARIAN: staged packet=${preferred.packetId}, source=${preferred.source}, diary=${summary.diaryDraftCount}, projectDrafts=${summary.projectBriefcaseDraftCount}.`, "log-blue");
    window.AIDA_CRASH_BUFFER?.checkpoint?.("librarian_staged");
    window.AIDA_CURATOR?.reviewLibrarian?.();
    consoleReport("AIDA_LIBRARIAN_STAGED", {
      ...summary,
      preferred: {
        source: preferred.source,
        method: preferred.method,
        counts: preferred.counts,
        preview: preferred.preview
      }
    });
    return {
      ready: true,
      preferred,
      summary
    };
  }

  function inspect() {
    const summary = safeSummary();
    log("LIBRARIAN: staged memory summary follows.", "log-blue");
    if (!summary.ready) {
      log("LIBRARIAN: no sleep bundle staged yet.", "log-amber");
      return summary;
    }
    log(`LIBRARIAN: packet=${summary.lastIngestedPacketId}, diary=${summary.diaryDraftCount}, rolling=${summary.rollingSummaryDraftCount}, long=${summary.longSummaryDraftCount}`);
    log(`LIBRARIAN: facts=${summary.factCandidateCount}, insights=${summary.insightCandidateCount}, sensitive=${summary.sensitiveContextCandidateCount}, tone=${summary.salutationSignalCount}, raw=${summary.rawLogEntryCount}, backlog=${summary.processingBacklogCount}`);
    log(`LIBRARIAN: projectBriefcases=${summary.projectBriefcaseDraftCount}`);
    if (summary.lastProjectDraft) {
      log(`LIBRARIAN PROJECT: ${summary.lastProjectDraft.project?.name || "unknown_project"}, status=${summary.lastProjectDraft.status || "staged"}`);
    }
    consoleReport("AIDA_LIBRARIAN_INSPECT", {
      summary,
      staged: getStaged()
    });
    return summary;
  }

  function install() {
    ensureState();
    log("Librarian organ loaded. Memory staging is runtime-only.", "log-blue");
  }

  window.AIDA_LIBRARIAN = {
    ingestSleep,
    inspect,
    safeSummary,
    getStaged
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "memory_staging",
      reads: ["AIDA_SLEEP.getPreferredDistillation", "AIDA_RUNTIME.sleep.lastPacket"],
      writes: [
        "AIDA_RUNTIME.librarian.diaryDrafts",
        "AIDA_RUNTIME.librarian.rollingSummaryDrafts",
        "AIDA_RUNTIME.librarian.longSummaryDrafts",
        "AIDA_RUNTIME.librarian.factCandidates",
        "AIDA_RUNTIME.librarian.insightCandidates",
        "AIDA_RUNTIME.librarian.sensitiveContextCandidates",
        "AIDA_RUNTIME.librarian.salutationSignals",
        "AIDA_RUNTIME.librarian.rawLogEntries",
        "AIDA_RUNTIME.librarian.processingBacklog",
        "AIDA_RUNTIME.librarian.projectBriefcaseDrafts"
      ],
      requires: ["AIDA_RUNTIME", "AIDA_SLEEP"],
      verifies: ["preferred sleep distillation is staged into diary and project briefcase drafts without Drive writes"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
