// AIDA REVIEW BLOCK 1: File header - AIDA_ONE_SPINE\spine\librarian.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
(function () {
  const MODULE_ID = "spine.librarian";

// AIDA REVIEW BLOCK 3: Function runtime - callable behavior in this runtime organ.
  function runtime() {
    return window.AIDA_RUNTIME;
  }

// AIDA REVIEW BLOCK 4: Function log - callable behavior in this runtime organ.
  function log(message, className = "log-blue") {
    if (window.AIDA_BIOS?.log) {
      window.AIDA_BIOS.log(message, className);
      return;
    }
    if (window.AIDA_BODY?.pulse) window.AIDA_BODY.pulse(message);
  }

// AIDA REVIEW BLOCK 5: Function nowIso - callable behavior in this runtime organ.
  function nowIso() {
    return new Date().toISOString();
  }

// AIDA REVIEW BLOCK 6: Function copyJson - callable behavior in this runtime organ.
  function copyJson(value, fallback) {
    if (value === undefined) return fallback;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return fallback;
    }
  }

// AIDA REVIEW BLOCK 7: Function safeArray - callable behavior in this runtime organ.
  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

// AIDA REVIEW BLOCK 8: Function cleanBriefcaseText - callable behavior in this runtime organ.
  function cleanBriefcaseText(value, maxLength = 1200) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}...` : text;
  }

// AIDA REVIEW BLOCK 9: Function slug - callable behavior in this runtime organ.
  function slug(value, fallback = "project") {
    return String(value || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || fallback;
  }

// AIDA REVIEW BLOCK 10: Function consoleReport - callable behavior in this runtime organ.
  function consoleReport(label, value) {
    if (typeof console === "undefined" || !console.log) return;
    try {
      console.log(label, copyJson(value, value));
    } catch (error) {
      console.log(label, value);
    }
  }

// AIDA REVIEW BLOCK 11: Function ensureState - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 12: Function upsertById - callable behavior in this runtime organ.
  function upsertById(list, item) {
    if (!item || typeof item !== "object") return;
    const id = item.id || `${item.type || "item"}_${list.length + 1}`;
    const stamped = { ...item, id };
    const index = list.findIndex((existing) => existing?.id === id);
    if (index >= 0) list[index] = stamped;
    else list.push(stamped);
  }

// AIDA REVIEW BLOCK 13: Function isLegacyFallbackCandidate - callable behavior in this runtime organ.
  function isLegacyFallbackCandidate(item) {
    return item?.source === "fallback" || item?.method === "deterministic_runtime_draft";
  }

// AIDA REVIEW BLOCK 14: Function pruneLegacyFallbackCandidates - callable behavior in this runtime organ.
  function pruneLegacyFallbackCandidates(state) {
    state.factCandidates = safeArray(state.factCandidates).filter((item) => !isLegacyFallbackCandidate(item));
    state.insightCandidates = safeArray(state.insightCandidates).filter((item) => !isLegacyFallbackCandidate(item));
  }

// AIDA REVIEW BLOCK 15: Function projectFromPreferred - callable behavior in this runtime organ.
  function projectFromPreferred(preferred) {
    const firstDiary = preferred.output?.diaryDrafts?.[0] || null;
    const firstSummary = preferred.output?.rollingSummaries?.[0] || preferred.output?.longSummaryCandidates?.[0] || null;
    const scope = firstSummary?.scope || "";
    const scopedProject = scope.startsWith("project:") ? scope.slice("project:".length) : null;
    return firstDiary?.project || scopedProject || "unknown_project";
  }

// AIDA REVIEW BLOCK 16: Function realmFromPreferred - callable behavior in this runtime organ.
  function realmFromPreferred(preferred) {
    return preferred.output?.diaryDrafts?.[0]?.realm || projectFromPreferred(preferred);
  }

// AIDA REVIEW BLOCK 17: Function packetProjectFile - callable behavior in this runtime organ.
  function packetProjectFile(packet) {
    const exchanges = safeArray(packet?.session?.exchanges);
    const tagged = exchanges.find((item) => item?.tags?.project_file && item.tags.project_file !== "none");
    return tagged?.tags?.project_file || runtime()?.context?.newProjectDraft?.fileName || null;
  }

// AIDA REVIEW BLOCK 18: Function runtimeProject - callable behavior in this runtime organ.
  function runtimeProject(fileName, projectName) {
    const rt = runtime();
    if (fileName && rt?.drive?.files?.[fileName]) return copyJson(rt.drive.files[fileName], null);
    return copyJson(
      Object.values(rt?.mind?.projects || {}).find((item) => (
        item?.project_name === projectName || item?.name === projectName
      )) || null,
      null
    );
  }

// AIDA REVIEW BLOCK 19: Function buildProjectBriefcaseDraft - callable behavior in this runtime organ.
  function buildProjectBriefcaseDraft(preferred, ingestedAt, packet = runtime()?.sleep?.lastPacket) {
    const project = projectFromPreferred(preferred);
    const realm = realmFromPreferred(preferred);
    const fileName = packetProjectFile(packet) || `project_briefcase_${slug(project)}.json`;
    const initialProject = runtimeProject(fileName, project);
    const llm = packet?.llm || {};
    const output = preferred.output || {};
    const rolling = safeArray(output.rollingSummaries);
    const long = safeArray(output.longSummaryCandidates);
    const facts = safeArray(output.factCandidates);
    const insights = safeArray(output.insightCandidates);
    const sensitive = safeArray(output.sensitiveContextCandidates);
    const salutations = safeArray(output.salutationSignals);
    const openThreads = safeArray(output.openThreads);
    const existingLedger = safeArray(output.projectLedgerUpdates);
    const mergeNotes = preferred.mergeNotes || {};
    const diarySummary = cleanBriefcaseText(safeArray(output.diaryDrafts)[0]?.entry);
    const usedFallbackRolling = preferred.source === "llm" && mergeNotes.usedFallbackRollingSummaries;
    const usedFallbackLong = preferred.source === "llm" && mergeNotes.usedFallbackLongSummaryCandidates;
    const latestSummary = usedFallbackRolling ? diarySummary : cleanBriefcaseText(rolling[0]?.text);
    const latestStatus = usedFallbackLong ? latestSummary : cleanBriefcaseText(long[0]?.text);
    const rollingSummaryIds = usedFallbackRolling ? [] : rolling.map((item) => item.id).filter(Boolean);
    const longSummaryIds = usedFallbackLong ? [] : long.map((item) => item.id).filter(Boolean);

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
          realm,
          file: fileName
        },
        fileName,
        initialProject,
        llm_provider: llm.provider || null,
        llm_profile: llm.profile || null,
        llm_model: llm.model || null,
        llm_scope: llm.scope || llm.provider || "shared",
        update: {
          latest_summary: latestSummary || null,
          latest_status: latestStatus || null,
          rolling_summary_ids: rollingSummaryIds,
          long_summary_candidate_ids: longSummaryIds,
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

// AIDA REVIEW BLOCK 20: Function removePacketEntries - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 21: Function sourceTurnRange - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 22: Function normalizeDiaryDraft - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 23: Function getStaged - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 24: Function safeSummary - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 25: Function evidenceKind - callable behavior in this runtime organ.
  function evidenceKind(type) {
    const value = String(type || "");
    if (value.includes("diary")) return "diary";
    if (value.includes("raw")) return "raw_log";
    if (value.includes("fact")) return "fact";
    if (value.includes("insight")) return "insight";
    if (value.includes("project") || value.includes("summary") || value.includes("long_") || value.includes("rolling_")) return "summary";
    if (value.includes("tone") || value.includes("salutation")) return "tone";
    if (value.includes("sensitive")) return "sensitive";
    return "other";
  }

// AIDA REVIEW BLOCK 26: Function review - callable behavior in this runtime organ.
  function review(query, options = {}) {
    const text = String(query || "").trim();
    if (!text) {
      return {
        ready: false,
        query: text,
        reason: "query_required",
        instruction: "Ask what idea, theme, or memory the Librarian should look for."
      };
    }
    if (!window.AIDA_CRAWLER?.search) {
      return {
        ready: false,
        query: text,
        reason: "crawler_unavailable",
        instruction: "The Librarian cannot search the indexed archive yet."
      };
    }

    window.AIDA_CRAWLER.indexNow?.("librarian_review");
    const result = window.AIDA_CRAWLER.search(text, {
      limit: Number(options.limit || 12),
      minScore: Number(options.minScore || 1),
      project: options.project || null
    });
    const evidence = safeArray(result.results).map((item) => ({
      id: item.id,
      kind: evidenceKind(item.type),
      type: item.type,
      title: item.title,
      text: cleanBriefcaseText(item.text, 900),
      score: item.score,
      sourceRefs: safeArray(item.sourceRefs),
      reviewWindow: item.reviewWindow || null,
      project: item.project || null,
      humanSource: item.humanSource || null,
      packetId: item.packetId || null
    }));
    const grouped = evidence.reduce((groups, item) => {
      groups[item.kind] = groups[item.kind] || [];
      groups[item.kind].push(item);
      return groups;
    }, {});
    const reviewedAt = nowIso();
    const response = {
      ready: true,
      query: text,
      reviewedAt,
      resultCount: evidence.length,
      evidence,
      grouped,
      instruction: evidence.length
        ? "Synthesize cautiously across this evidence. Distinguish direct log text from summaries, facts, and interpretations. Mention uncertainty when evidence is partial or conflicting."
        : "No indexed evidence matched. Say the Librarian did not find it rather than inventing an answer."
    };

    const state = ensureState();
    state.lastReview = {
      query: text,
      reviewedAt,
      resultCount: evidence.length,
      topEvidenceIds: evidence.slice(0, 5).map((item) => item.id)
    };
    consoleReport("AIDA_LIBRARIAN_REVIEW", response);
    return response;
  }

// AIDA REVIEW BLOCK 27: Function prepareArchive - callable behavior in this runtime organ.
  async function prepareArchive(reason = "librarian_request") {
    const fetchByName = window.AIDA_DRIVE?.fetchJsonByName;
    if (!fetchByName) {
      window.AIDA_CRAWLER?.indexNow?.(`${reason}_runtime_only`);
      return {
        ready: false,
        reason: "drive_lazy_fetch_unavailable",
        loaded: [],
        failed: []
      };
    }

    const names = [
      "diary_log.json",
      "raw_session_log.json",
      "project_summary.json",
      "memory_summary.json",
      "facts.json",
      "facts_candidates.json",
      "insights.json",
      "insights_candidates.json",
      "sensitive_context_candidates.json",
      "salutation_tone_signals.json"
    ];
    const loaded = [];
    const failed = [];
    for (const name of names) {
      try {
        await fetchByName(name, reason);
        loaded.push(name);
      } catch (error) {
        failed.push({ name, reason: error.message });
      }
    }
    const indexed = window.AIDA_CRAWLER?.indexNow?.(reason) || null;
    log(`LIBRARIAN: archive prepared. loaded=${loaded.length}, unavailable=${failed.length}.`, failed.length ? "log-amber" : "log-blue");
    return {
      ready: loaded.length > 0,
      loaded,
      failed,
      indexed
    };
  }

// AIDA REVIEW BLOCK 28: Function ingestSleep - callable behavior in this runtime organ.
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
    buildProjectBriefcaseDraft(preferred, ingestedAt, packet).forEach((item) => upsertById(state.projectBriefcaseDrafts, item));

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

// AIDA REVIEW BLOCK 29: Function inspect - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 30: Function install - callable behavior in this runtime organ.
  function install() {
    ensureState();
    log("Librarian organ loaded. Memory staging is runtime-only.", "log-blue");
  }

// AIDA REVIEW BLOCK 31: Browser export AIDA_LIBRARIAN - exposes this organ to the page runtime.
  window.AIDA_LIBRARIAN = {
    ingestSleep,
    prepareArchive,
    review,
    inspect,
    safeSummary,
    getStaged
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "memory_staging",
      reads: ["AIDA_SLEEP.getPreferredDistillation", "AIDA_RUNTIME.sleep.lastPacket", "AIDA_CRAWLER.search"],
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

// AIDA REVIEW BLOCK 32: Browser event wiring - connects page lifecycle or user actions to this organ.
  document.addEventListener("DOMContentLoaded", install);
})();
