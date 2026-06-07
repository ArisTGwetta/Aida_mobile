(function () {
  const MODULE_ID = "spine.curator";

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

  function slug(value, fallback = "draft") {
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
    rt.curator = rt.curator || {};
    rt.curator.projectListingDrafts = rt.curator.projectListingDrafts || [];
    rt.curator.projectBriefcaseWriteDrafts = rt.curator.projectBriefcaseWriteDrafts || [];
    rt.curator.diaryWriteDrafts = rt.curator.diaryWriteDrafts || [];
    rt.curator.factWriteDrafts = rt.curator.factWriteDrafts || [];
    rt.curator.insightWriteDrafts = rt.curator.insightWriteDrafts || [];
    rt.curator.needsConfirmation = rt.curator.needsConfirmation || [];
    rt.curator.writePlanDrafts = rt.curator.writePlanDrafts || [];
    rt.curator.reviewLog = rt.curator.reviewLog || [];
    return rt.curator;
  }

  function upsertById(list, item) {
    if (!item || typeof item !== "object") return;
    const id = item.id || `${item.type || "curator_draft"}_${list.length + 1}`;
    const stamped = { ...item, id };
    const index = list.findIndex((existing) => existing?.id === id);
    if (index >= 0) list[index] = stamped;
    else list.push(stamped);
  }

  function projectNameFromDraft(draft) {
    return (
      draft?.project?.name ||
      draft?.project?.project ||
      draft?.project ||
      draft?.scope?.replace(/^project:/, "") ||
      "unknown_project"
    );
  }

  function latestProjectDraft(staged) {
    return safeArray(staged.projectBriefcaseDrafts).slice(-1)[0] || null;
  }

  function classifyFact(fact) {
    const claim = String(fact?.claim || "");
    const confidence = Number(fact?.confidence || 0);
    const risky = /\b(allergy|medical|medicine|legal|law|financial|bank|password|secret|identity|address|phone|email|safety)\b/i.test(claim);
    const explicit = /\b(?:i|we)\s+(?:need|want|prefer|like|love|use|work on|am working on|care about|do not|don't|cannot|can't|won't)\b/i.test(claim);

    if (risky) return "needs_confirmation";
    if (explicit && confidence >= 0.62) return "candidate";
    return "needs_confirmation";
  }

  function reviewFacts(staged, reviewedAt) {
    return safeArray(staged.factCandidates).map((fact) => {
      const reviewStatus = classifyFact(fact);
      return {
        ...fact,
        type: "fact_write_draft",
        reviewStatus,
        writeStatus: reviewStatus === "candidate" ? "staged_candidate" : "needs_confirmation",
        reviewedAt
      };
    });
  }

  function reviewInsights(staged, reviewedAt) {
    return safeArray(staged.insightCandidates).map((insight) => ({
      ...insight,
      type: "insight_write_draft",
      reviewStatus: "candidate",
      writeStatus: "staged_candidate",
      reviewedAt
    }));
  }

  function buildDiaryWrites(staged, reviewedAt) {
    return safeArray(staged.diaryDrafts).map((draft) => ({
      ...draft,
      type: "diary_write_draft",
      writeStatus: "staged_append",
      reviewedAt
    }));
  }

  function buildProjectListingDraft(staged, reviewedAt) {
    const projectDraft = latestProjectDraft(staged);
    if (!projectDraft) return null;
    const projectName = projectNameFromDraft(projectDraft);
    const update = projectDraft.update || {};
    return {
      id: `project_listing_${slug(projectName)}_${slug(projectDraft.packetId || reviewedAt)}`,
      type: "project_listing_update",
      writeStatus: "staged",
      project: {
        name: projectName,
        realm: projectDraft.project?.realm || projectName
      },
      sourcePacketId: projectDraft.packetId || staged.lastIngestedPacketId || null,
      source: projectDraft.source || "unknown",
      method: projectDraft.method || "unknown",
      latest_summary: update.latest_summary || null,
      latest_status: update.latest_status || null,
      last_active: update.last_active || projectDraft.ingestedAt || reviewedAt,
      open_thread_count: safeArray(update.open_threads).length,
      fact_candidate_count: safeArray(update.facts_to_consider).length,
      insight_candidate_count: safeArray(update.insights_to_consider).length,
      reviewedAt
    };
  }

  function buildProjectBriefcaseWrites(staged, reviewedAt) {
    return safeArray(staged.projectBriefcaseDrafts).map((draft) => ({
      ...draft,
      type: "project_briefcase_write_draft",
      writeStatus: "staged_update",
      reviewedAt
    }));
  }

  function buildWritePlan(state, reviewedAt) {
    const packetId = state.lastReviewedPacketId || "unknown_packet";
    return {
      id: `write_plan_${slug(packetId)}`,
      type: "drive_write_plan_draft",
      status: "draft_only",
      reviewedAt,
      writes: {
        diary_appends: state.diaryWriteDrafts.length,
        project_listing_updates: state.projectListingDrafts.length,
        project_briefcase_updates: state.projectBriefcaseWriteDrafts.length,
        fact_candidates: state.factWriteDrafts.filter((item) => item.writeStatus === "staged_candidate").length,
        insight_candidates: state.insightWriteDrafts.length,
        needs_confirmation: state.needsConfirmation.length
      },
      targets: [
        "diary",
        "project_summary",
        "project_briefcase",
        "facts_candidates",
        "insights_candidates"
      ]
    };
  }

  function removePacketEntries(state, packetId) {
    if (!packetId) return;
    for (const key of [
      "projectListingDrafts",
      "projectBriefcaseWriteDrafts",
      "diaryWriteDrafts",
      "factWriteDrafts",
      "insightWriteDrafts",
      "needsConfirmation"
    ]) {
      state[key] = safeArray(state[key]).filter((item) => (
        item.sourcePacketId !== packetId &&
        item.packetId !== packetId
      ));
    }
    state.writePlanDrafts = safeArray(state.writePlanDrafts).filter((item) => (
      item.id !== `write_plan_${slug(packetId)}` &&
      item.sourcePacketId !== packetId &&
      item.packetId !== packetId
    ));
  }

  function reviewLibrarian() {
    const state = ensureState();
    if (!window.AIDA_LIBRARIAN?.getStaged) {
      log("CURATOR: Librarian staging is unavailable.", "log-amber");
      return { ready: false, reason: "librarian_unavailable" };
    }

    const staged = window.AIDA_LIBRARIAN.getStaged();
    if (!staged.lastIngestedPacketId) {
      log("CURATOR: no Librarian staged packet to review.", "log-amber");
      return { ready: false, reason: "nothing_staged" };
    }

    const reviewedAt = nowIso();
    removePacketEntries(state, staged.lastIngestedPacketId);

    buildDiaryWrites(staged, reviewedAt).forEach((item) => upsertById(state.diaryWriteDrafts, item));
    buildProjectBriefcaseWrites(staged, reviewedAt).forEach((item) => upsertById(state.projectBriefcaseWriteDrafts, item));

    const listing = buildProjectListingDraft(staged, reviewedAt);
    if (listing) upsertById(state.projectListingDrafts, listing);

    reviewFacts(staged, reviewedAt).forEach((item) => {
      upsertById(state.factWriteDrafts, item);
      if (item.writeStatus === "needs_confirmation") upsertById(state.needsConfirmation, item);
    });
    reviewInsights(staged, reviewedAt).forEach((item) => upsertById(state.insightWriteDrafts, item));

    state.lastReviewedAt = reviewedAt;
    state.lastReviewedPacketId = staged.lastIngestedPacketId;
    const writePlan = buildWritePlan(state, reviewedAt);
    upsertById(state.writePlanDrafts, writePlan);
    state.reviewLog.push({
      packetId: staged.lastIngestedPacketId,
      reviewedAt,
      diary: state.diaryWriteDrafts.length,
      projectListings: state.projectListingDrafts.length,
      projectBriefcases: state.projectBriefcaseWriteDrafts.length,
      facts: state.factWriteDrafts.length,
      insights: state.insightWriteDrafts.length,
      needsConfirmation: state.needsConfirmation.length
    });
    state.reviewLog = state.reviewLog.slice(-20);

    const summary = safeSummary();
    log(`CURATOR: reviewed packet=${staged.lastIngestedPacketId}, listings=${summary.projectListingDraftCount}, writePlans=${summary.writePlanDraftCount}.`, "log-blue");
    window.AIDA_CRASH_BUFFER?.checkpoint?.("curator_reviewed");
    consoleReport("AIDA_CURATOR_REVIEWED", {
      summary,
      latestProjectListing: state.projectListingDrafts[state.projectListingDrafts.length - 1] || null,
      latestWritePlan: writePlan
    });
    return { ready: true, summary, writePlan };
  }

  function getReviewed() {
    const state = ensureState();
    return {
      lastReviewedAt: state.lastReviewedAt || null,
      lastReviewedPacketId: state.lastReviewedPacketId || null,
      projectListingDrafts: copyJson(state.projectListingDrafts, []),
      projectBriefcaseWriteDrafts: copyJson(state.projectBriefcaseWriteDrafts, []),
      diaryWriteDrafts: copyJson(state.diaryWriteDrafts, []),
      factWriteDrafts: copyJson(state.factWriteDrafts, []),
      insightWriteDrafts: copyJson(state.insightWriteDrafts, []),
      needsConfirmation: copyJson(state.needsConfirmation, []),
      writePlanDrafts: copyJson(state.writePlanDrafts, []),
      reviewLog: copyJson(state.reviewLog, [])
    };
  }

  function safeSummary() {
    const state = ensureState();
    return {
      ready: Boolean(state.lastReviewedPacketId),
      lastReviewedAt: state.lastReviewedAt || null,
      lastReviewedPacketId: state.lastReviewedPacketId || null,
      projectListingDraftCount: state.projectListingDrafts.length,
      projectBriefcaseWriteDraftCount: state.projectBriefcaseWriteDrafts.length,
      diaryWriteDraftCount: state.diaryWriteDrafts.length,
      factWriteDraftCount: state.factWriteDrafts.length,
      insightWriteDraftCount: state.insightWriteDrafts.length,
      needsConfirmationCount: state.needsConfirmation.length,
      writePlanDraftCount: state.writePlanDrafts.length,
      lastProjectListing: state.projectListingDrafts[state.projectListingDrafts.length - 1] || null,
      lastWritePlan: state.writePlanDrafts[state.writePlanDrafts.length - 1] || null
    };
  }

  function inspect() {
    const summary = safeSummary();
    log("CURATOR: review summary follows.", "log-blue");
    if (!summary.ready) {
      log("CURATOR: no reviewed Librarian staging yet.", "log-amber");
      return summary;
    }
    log(`CURATOR: packet=${summary.lastReviewedPacketId}, diary=${summary.diaryWriteDraftCount}, projectListings=${summary.projectListingDraftCount}, briefcases=${summary.projectBriefcaseWriteDraftCount}`);
    log(`CURATOR: facts=${summary.factWriteDraftCount}, insights=${summary.insightWriteDraftCount}, needsConfirmation=${summary.needsConfirmationCount}`);
    consoleReport("AIDA_CURATOR_INSPECT", {
      summary,
      reviewed: getReviewed()
    });
    return summary;
  }

  function install() {
    ensureState();
    log("Curator organ loaded. Review/write plans are draft-only.", "log-blue");
  }

  window.AIDA_CURATOR = {
    reviewLibrarian,
    inspect,
    safeSummary,
    getReviewed
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "memory_review",
      reads: ["AIDA_LIBRARIAN.getStaged", "AIDA_RUNTIME.librarian"],
      writes: [
        "AIDA_RUNTIME.curator.projectListingDrafts",
        "AIDA_RUNTIME.curator.projectBriefcaseWriteDrafts",
        "AIDA_RUNTIME.curator.diaryWriteDrafts",
        "AIDA_RUNTIME.curator.factWriteDrafts",
        "AIDA_RUNTIME.curator.insightWriteDrafts",
        "AIDA_RUNTIME.curator.writePlanDrafts"
      ],
      requires: ["AIDA_RUNTIME", "AIDA_LIBRARIAN"],
      verifies: ["Librarian staging becomes reviewed project listing and write-plan drafts without Drive writes"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
