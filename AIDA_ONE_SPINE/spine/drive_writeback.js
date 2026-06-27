(function () {
  const MODULE_ID = "spine.drive.writeback";

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

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function copyJson(value, fallback) {
    if (value === undefined) return fallback;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return fallback;
    }
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
    rt.driveWriteback = rt.driveWriteback || {};
    rt.driveWriteback.operations = rt.driveWriteback.operations || [];
    rt.driveWriteback.history = rt.driveWriteback.history || [];
    return rt.driveWriteback;
  }

  function token() {
    return runtime()?.tokens?.drive?.accessToken || null;
  }

  function folderId() {
    return runtime()?.drive?.folderId || window.AIDA_CONFIG?.drive?.jsonFolderId || null;
  }

  function fileIndex(name) {
    return runtime()?.drive?.fileIndex?.[name] || null;
  }

  function targetBriefcaseFile(draft) {
    const candidates = [
      draft?.project?.briefcaseFile,
      draft?.project?.briefcase_file,
      draft?.project?.projectBriefcase,
      draft?.project?.project_briefcase,
      draft?.fileName,
      draft?.project?.file,
      draft?.project?.fileName
    ].filter(Boolean).map(String);

    const projectBriefcase = candidates.find((name) => /^project_briefcase_.*\.json$/i.test(name));
    if (projectBriefcase) return projectBriefcase;

    const briefcase = candidates.find((name) => /^briefcase_.*\.json$/i.test(name));
    if (briefcase) return briefcase;

    const project = candidates.find((name) => /^project_.*\.json$/i.test(name) && !/^project_summary\.json$/i.test(name));
    if (project) return project;

    return `project_briefcase_${slug(draft?.project?.name || draft?.project || "unknown_project")}.json`;
  }

  function appendUnique(list, items) {
    const out = safeArray(list).slice();
    safeArray(items).forEach((item) => {
      const key = item?.id || item?.sourcePacketId || item?.packetId || JSON.stringify(item);
      if (!out.some((existing) => (existing?.id || existing?.sourcePacketId || existing?.packetId || JSON.stringify(existing)) === key)) {
        out.push(item);
      }
    });
    return out;
  }

  function mergeAppendStore(existing, key, items, generatedAt) {
    const base = Array.isArray(existing) ? { [key]: existing } : { ...(existing || {}) };
    base[key] = appendUnique(base[key], items);
    base.last_updated = generatedAt;
    return base;
  }

  function mergeProjectSummary(existing, listings, generatedAt) {
    const base = { ...(existing || {}) };
    const containerKey = base.projects ? "projects" : base.project_briefcases ? "project_briefcases" : "projects";
    base[containerKey] = { ...(base[containerKey] || {}) };
    safeArray(listings).forEach((listing) => {
      const name = listing?.project?.name || "unknown_project";
      const prior = base[containerKey][name] || {};
      base[containerKey][name] = {
        ...prior,
        name,
        realm: listing?.project?.realm || prior.realm || name,
        latest_summary: listing.latest_summary || prior.latest_summary || null,
        latest_status: listing.latest_status || prior.latest_status || null,
        last_active: listing.last_active || generatedAt,
        sourcePacketId: listing.sourcePacketId || prior.sourcePacketId || null,
        source: listing.source || prior.source || null,
        method: listing.method || prior.method || null,
        open_thread_count: listing.open_thread_count || 0,
        fact_candidate_count: listing.fact_candidate_count || 0,
        insight_candidate_count: listing.insight_candidate_count || 0
      };
    });
    base.last_updated = generatedAt;
    return base;
  }

  function mergeBriefcase(existing, draft, generatedAt) {
    const base = {
      ...(draft?.initialProject || {}),
      ...(existing || {})
    };
    const update = draft?.update || {};
    const replaceConsiderationLists = draft?.source === "llm" || draft?.method === "llm_refined_draft";
    const wasRuntimeDraft = base?.draft?.status === "runtime_only" || base?.status === "runtime_draft";
    return {
      ...base,
      project_name: base.project_name || draft?.project?.name || draft?.project || "unknown_project",
      name: base.name || base.project_name || draft?.project?.name || draft?.project || "unknown_project",
      realm: base.realm || draft?.project?.realm || draft?.project?.name || "unknown_realm",
      status: wasRuntimeDraft ? "active" : base.status || "active",
      privacy: base.privacy || "private_candidate",
      latest_summary: update.latest_summary || base.latest_summary || null,
      latest_status: update.latest_status || base.latest_status || null,
      rolling_summary_ids: appendUnique(base.rolling_summary_ids, update.rolling_summary_ids || []),
      long_summary_candidate_ids: appendUnique(base.long_summary_candidate_ids, update.long_summary_candidate_ids || []),
      open_threads: replaceConsiderationLists ? safeArray(update.open_threads) : appendUnique(base.open_threads, update.open_threads || []),
      facts_to_consider: replaceConsiderationLists ? safeArray(update.facts_to_consider) : appendUnique(base.facts_to_consider, update.facts_to_consider || []),
      insights_to_consider: replaceConsiderationLists ? safeArray(update.insights_to_consider) : appendUnique(base.insights_to_consider, update.insights_to_consider || []),
      sensitive_context_to_consider: replaceConsiderationLists ? safeArray(update.sensitive_context_to_consider) : appendUnique(base.sensitive_context_to_consider, update.sensitive_context_to_consider || []),
      salutation_tone_signals: replaceConsiderationLists ? safeArray(update.salutation_tone_signals) : appendUnique(base.salutation_tone_signals, update.salutation_tone_signals || []),
      emotional_notes: appendUnique(base.emotional_notes, update.emotional_notes || []),
      last_active: update.last_active || base.last_active || generatedAt,
      last_updated: generatedAt,
      last_write_packet_id: draft.packetId || base.last_write_packet_id || null,
      llm_provider: draft.llm_provider || base.llm_provider || null,
      llm_profile: draft.llm_profile || base.llm_profile || null,
      llm_model: draft.llm_model || base.llm_model || null,
      llm_scope: draft.llm_scope || base.llm_scope || draft.llm_provider || null,
      draft: wasRuntimeDraft
        ? {
            ...(base.draft || {}),
            status: "persisted",
            persisted_at: generatedAt,
            persisted_packet_id: draft.packetId || null
          }
        : base.draft || null
    };
  }

  function buildOperations(reviewed = window.AIDA_CURATOR?.getReviewed?.()) {
    const generatedAt = nowIso();
    const ops = [];
    if (reviewed?.lastReviewedPacketId && safeArray(reviewed.diaryWriteDrafts).length) {
      ops.push({
        target: "diary",
        fileName: "diary_log.json",
        mode: "append",
        merge: (existing) => mergeAppendStore(existing, "entries", reviewed.diaryWriteDrafts, generatedAt),
        count: reviewed.diaryWriteDrafts.length
      });
    }

    if (reviewed?.lastReviewedPacketId && safeArray(reviewed.projectListingDrafts).length) {
      ops.push({
        target: "project_summary",
        fileName: "project_summary.json",
        mode: "upsert",
        merge: (existing) => mergeProjectSummary(existing, reviewed.projectListingDrafts, generatedAt),
        count: reviewed.projectListingDrafts.length
      });
    }

    safeArray(runtime()?.driveWriteback?.briefcaseEdits)
      .filter((item) => item?.status === "staged")
      .forEach((item) => {
        ops.push({
          target: "briefcase_header_edit",
          fileName: item.fileName,
          mode: "replace",
          merge: () => copyJson(item.content, {}),
          count: 1,
          briefcaseEditId: item.id
        });
      });

    safeArray(reviewed?.projectBriefcaseWriteDrafts).forEach((draft) => {
      ops.push({
        target: "project_briefcase",
        fileName: targetBriefcaseFile(draft),
        mode: "merge",
        merge: (existing) => mergeBriefcase(existing, draft, generatedAt),
        count: 1,
        packetId: draft.packetId || null
      });
    });

    const factCandidates = safeArray(reviewed?.factWriteDrafts).filter((item) => item.writeStatus === "staged_candidate");
    if (factCandidates.length) {
      ops.push({
        target: "facts_candidates",
        fileName: "facts_candidates.json",
        mode: "append",
        merge: (existing) => mergeAppendStore(existing, "candidates", factCandidates, generatedAt),
        count: factCandidates.length
      });
    }

    const insightCandidates = safeArray(reviewed?.insightWriteDrafts).filter((item) => item.writeStatus === "staged_candidate");
    if (insightCandidates.length) {
      ops.push({
        target: "insights_candidates",
        fileName: "insights_candidates.json",
        mode: "append",
        merge: (existing) => mergeAppendStore(existing, "candidates", insightCandidates, generatedAt),
        count: insightCandidates.length
      });
    }

    if (safeArray(reviewed?.sensitiveContextWriteDrafts).length) {
      ops.push({
        target: "sensitive_context_candidates",
        fileName: "sensitive_context_candidates.json",
        mode: "append",
        merge: (existing) => mergeAppendStore(existing, "candidates", reviewed.sensitiveContextWriteDrafts, generatedAt),
        count: reviewed.sensitiveContextWriteDrafts.length
      });
    }

    if (safeArray(reviewed?.salutationSignalWriteDrafts).length) {
      ops.push({
        target: "salutation_tone_signals",
        fileName: "salutation_tone_signals.json",
        mode: "append",
        merge: (existing) => mergeAppendStore(existing, "signals", reviewed.salutationSignalWriteDrafts, generatedAt),
        count: reviewed.salutationSignalWriteDrafts.length
      });
    }

    if (safeArray(reviewed?.rawLogWriteDrafts).length) {
      ops.push({
        target: "raw_session_log",
        fileName: "raw_session_log.json",
        mode: "append",
        merge: (existing) => mergeAppendStore(existing, "entries", reviewed.rawLogWriteDrafts, generatedAt),
        count: reviewed.rawLogWriteDrafts.length
      });
    }

    if (safeArray(reviewed?.processingBacklogWriteDrafts).length) {
      ops.push({
        target: "memory_processing_backlog",
        fileName: "memory_processing_backlog.json",
        mode: "append",
        merge: (existing) => mergeAppendStore(existing, "items", reviewed.processingBacklogWriteDrafts, generatedAt),
        count: reviewed.processingBacklogWriteDrafts.length
      });
    }

    safeArray(runtime()?.driveWriteback?.projectReconciliations)
      .filter((item) => item?.status === "staged")
      .forEach((item) => {
        ops.push({
          target: "project_reconciliation_survivor",
          fileName: item.survivorFile,
          mode: "replace",
          merge: () => copyJson(item.survivor, {}),
          count: 1,
          reconciliationId: item.id
        });
        ops.push({
          target: "project_reconciliation_archive",
          fileName: item.duplicateFile,
          mode: "replace",
          merge: () => copyJson(item.duplicate, {}),
          count: 1,
          reconciliationId: item.id
        });
      });

    safeArray(runtime()?.driveWriteback?.projectRelationshipUpdates)
      .filter((item) => item?.status === "staged")
      .forEach((item) => {
        safeArray(item.files).forEach((file) => {
          ops.push({
            target: "project_relationship_link",
            fileName: file.fileName,
            mode: "replace",
            merge: () => copyJson(file.content, {}),
            count: 1,
            relationshipUpdateId: item.id
          });
        });
      });

    return ops;
  }

  function preview() {
    const state = ensureState();
    const ops = buildOperations();
    const summary = ops.map((op) => ({
      target: op.target,
      fileName: op.fileName,
      mode: op.mode,
      count: op.count,
      existing: Boolean(fileIndex(op.fileName))
    }));
    state.lastPreviewAt = nowIso();
    state.operations = summary;
    state.lastStatus = ops.length ? "preview_ready" : "nothing_to_write";
    log(`DRIVE WRITEBACK: preview ${summary.length} operation(s).`, ops.length ? "log-blue" : "log-amber");
    consoleReport("AIDA_DRIVE_WRITEBACK_PREVIEW", { ready: Boolean(ops.length), operations: summary });
    return { ready: Boolean(ops.length), operations: summary };
  }

  async function ensureIndexed() {
    const rt = runtime();
    if (Object.keys(rt.drive?.fileIndex || {}).length) return;
    if (!window.AIDA_DRIVE?.listJsonFiles) throw new Error("AIDA_DRIVE.listJsonFiles is unavailable.");
    const files = await window.AIDA_DRIVE.listJsonFiles();
    rt.drive.fileIndex = {};
    files.forEach((file) => {
      rt.drive.fileIndex[file.name] = file;
    });
  }

  async function loadExisting(fileName) {
    const rt = runtime();
    if (rt.drive.files?.[fileName]) return rt.drive.files[fileName];
    if (!fileIndex(fileName)) return null;
    if (!window.AIDA_DRIVE?.fetchContextJson && !window.AIDA_DRIVE?.fetchEveryDriveJson) return null;
    if (window.AIDA_DRIVE?.fetchContextJson) {
      try {
        await window.AIDA_DRIVE.fetchContextJson(fileName);
      } catch (error) {
        // Fall through to direct media fetch below.
      }
    }
    if (rt.drive.files?.[fileName]) return rt.drive.files[fileName];

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileIndex(fileName).id}?alt=media`, {
      headers: { Authorization: `Bearer ${token()}` }
    });
    if (!response.ok) throw new Error(`Fetch failed for ${fileName}: HTTP ${response.status}.`);
    const data = await response.json();
    rt.drive.files[fileName] = data;
    return data;
  }

  async function updateFile(fileName, content) {
    const file = fileIndex(fileName);
    if (!file?.id) throw new Error(`Cannot update unindexed Drive file ${fileName}.`);
    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(content, null, 2)
    });
    if (!response.ok) throw new Error(`Drive update failed for ${fileName}: HTTP ${response.status}.`);
    return response.json();
  }

  async function createFile(fileName, content) {
    if (!folderId()) throw new Error("Drive JSON folder ID is missing.");
    const boundary = `aida_${Date.now()}`;
    const metadata = {
      name: fileName,
      mimeType: "application/json",
      parents: [folderId()]
    };
    const body = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(metadata),
      `--${boundary}`,
      "Content-Type: application/json",
      "",
      JSON.stringify(content, null, 2),
      `--${boundary}--`,
      ""
    ].join("\r\n");

    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token()}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body
    });
    if (!response.ok) throw new Error(`Drive create failed for ${fileName}: HTTP ${response.status}.`);
    return response.json();
  }

  async function apply(options = {}) {
    const dryRun = options.dryRun !== false;
    const state = ensureState();
    const ops = buildOperations();
    if (!ops.length) {
      const result = { ready: false, status: "nothing_to_write", dryRun, operations: [] };
      consoleReport("AIDA_DRIVE_WRITEBACK_APPLY", result);
      return result;
    }

    if (!dryRun) {
      if (!token()) throw new Error("Drive access token is missing.");
      await ensureIndexed();
    }

    const appliedAt = nowIso();
    const results = [];
    for (const op of ops) {
      const file = fileIndex(op.fileName);
      const action = file ? "update" : "create";
      try {
        const existing = dryRun ? (runtime().drive?.files?.[op.fileName] || null) : await loadExisting(op.fileName);
        const next = op.merge(existing);
        let driveResult = null;
        if (!dryRun) {
          driveResult = file ? await updateFile(op.fileName, next) : await createFile(op.fileName, next);
          runtime().drive.files[op.fileName] = next;
          runtime().drive.fileIndex[op.fileName] = {
            ...(runtime().drive.fileIndex[op.fileName] || {}),
            id: driveResult.id || file?.id,
            name: driveResult.name || op.fileName,
            mimeType: driveResult.mimeType || "application/json",
            modifiedTime: driveResult.modifiedTime || appliedAt
          };
        }
        results.push({
          target: op.target,
          fileName: op.fileName,
          action,
          count: op.count,
          dryRun,
          ok: true,
          reconciliationId: op.reconciliationId || null,
          relationshipUpdateId: op.relationshipUpdateId || null,
          briefcaseEditId: op.briefcaseEditId || null
        });
      } catch (error) {
        results.push({
          target: op.target,
          fileName: op.fileName,
          action,
          count: op.count,
          dryRun,
          ok: false,
          reconciliationId: op.reconciliationId || null,
          relationshipUpdateId: op.relationshipUpdateId || null,
          briefcaseEditId: op.briefcaseEditId || null,
          error: error.message
        });
        state.lastAppliedAt = null;
        state.lastStatus = dryRun ? "dry_run_failed" : "apply_failed";
        state.operations = results;
        state.history.push({ appliedAt, dryRun, results });
        state.history = state.history.slice(-20);
        const failed = { ready: false, status: state.lastStatus, dryRun, operations: results };
        log(`DRIVE WRITEBACK: failed on ${op.fileName}. ${error.message}`, "log-amber");
        consoleReport("AIDA_DRIVE_WRITEBACK_APPLY", failed);
        return failed;
      }
    }

    state.lastAppliedAt = dryRun ? null : appliedAt;
    state.lastStatus = dryRun ? "dry_run_complete" : "applied";
    state.operations = results;
    state.history.push({ appliedAt, dryRun, results });
    state.history = state.history.slice(-20);
    if (!dryRun) {
      runtime().drive.lastSync = appliedAt;
      const completedIds = new Set(
        results
          .filter((item) => item.ok && item.reconciliationId)
          .map((item) => item.reconciliationId)
      );
      safeArray(runtime().driveWriteback?.projectReconciliations).forEach((item) => {
        if (completedIds.has(item.id)) item.status = "committed";
      });
      const completedRelationshipIds = new Set(
        results
          .filter((item) => item.ok && item.relationshipUpdateId)
          .map((item) => item.relationshipUpdateId)
      );
      safeArray(runtime().driveWriteback?.projectRelationshipUpdates).forEach((item) => {
        if (completedRelationshipIds.has(item.id)) item.status = "committed";
      });
      const completedBriefcaseEditIds = new Set(
        results
          .filter((item) => item.ok && item.briefcaseEditId)
          .map((item) => item.briefcaseEditId)
      );
      safeArray(runtime().driveWriteback?.briefcaseEdits).forEach((item) => {
        if (completedBriefcaseEditIds.has(item.id)) item.status = "committed";
      });
      window.AIDA_DRIVE?.mapDriveFilesToMind?.({ selectDefault: false });
    }
    log(`DRIVE WRITEBACK: ${dryRun ? "dry-run" : "applied"} ${results.length} operation(s).`, "log-blue");
    consoleReport("AIDA_DRIVE_WRITEBACK_APPLY", { ready: true, status: state.lastStatus, dryRun, operations: results });
    return { ready: true, status: state.lastStatus, dryRun, operations: results };
  }

  function inspect() {
    const state = ensureState();
    const summary = {
      lastPreviewAt: state.lastPreviewAt || null,
      lastAppliedAt: state.lastAppliedAt || null,
      lastStatus: state.lastStatus || null,
      operations: state.operations || [],
      historyCount: safeArray(state.history).length
    };
    consoleReport("AIDA_DRIVE_WRITEBACK_INSPECT", summary);
    return summary;
  }

  function install() {
    ensureState();
    log("Drive writeback organ loaded. Use AIDA_DRIVE_WRITEBACK.preview() before apply().", "log-blue");
  }

  window.AIDA_DRIVE_WRITEBACK = {
    preview,
    apply,
    inspect
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "drive_writeback",
      reads: ["AIDA_CURATOR.getReviewed", "AIDA_RUNTIME.drive.fileIndex", "AIDA_RUNTIME.tokens.drive.accessToken"],
      writes: ["AIDA_RUNTIME.drive.files", "AIDA_RUNTIME.driveWriteback"],
      requires: ["AIDA_RUNTIME", "AIDA_CURATOR", "AIDA_DRIVE"],
      verifies: ["Curator write plans can be previewed, dry-run, and deliberately applied to Drive JSON"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
