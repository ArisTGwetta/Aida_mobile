// AIDA REVIEW BLOCK 1: File header - AIDA_ONE_SPINE\spine\crash_buffer.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
(function () {
  const MODULE_ID = "spine.crash.buffer";
  const DEFAULT_KEY = "AIDA_SPINE_CRASH_BUFFER_V1";

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

// AIDA REVIEW BLOCK 7: Function storage - callable behavior in this runtime organ.
  function storage() {
    try {
      if (!window.localStorage) return null;
      const probe = "__aida_crash_probe__";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch (error) {
      return null;
    }
  }

// AIDA REVIEW BLOCK 8: Function ensureState - callable behavior in this runtime organ.
  function ensureState() {
    const rt = runtime();
    rt.crashBuffer = rt.crashBuffer || {};
    rt.crashBuffer.key = rt.crashBuffer.key || DEFAULT_KEY;
    rt.crashBuffer.available = Boolean(storage());
    return rt.crashBuffer;
  }

// AIDA REVIEW BLOCK 9: Function hasWork - callable behavior in this runtime organ.
  function hasWork(rt) {
    return Boolean(
      rt?.session?.currentTurns?.length ||
      rt?.sleep?.pendingJournal?.length ||
      rt?.contextEvolution?.queuedChunks?.length ||
      rt?.contextEvolution?.summaryDrafts?.length ||
      rt?.contextEvolution?.projectLedgerDrafts?.length
    );
  }

// AIDA REVIEW BLOCK 10: Function buildSnapshot - callable behavior in this runtime organ.
  function buildSnapshot(reason = "manual") {
    const rt = runtime();
    const savedAt = nowIso();
    return {
      version: 1,
      savedAt,
      reason,
      session: copyJson(rt.session || {}, {}),
      contextEvolution: copyJson(rt.contextEvolution || {}, {}),
      sleep: {
        pendingJournal: copyJson(rt.sleep?.pendingJournal || [], []),
        lastContextCheckpoint: copyJson(rt.sleep?.lastContextCheckpoint || null, null),
        lastActive: rt.sleep?.lastActive || null
      },
      librarian: copyJson(rt.librarian || null, null),
      curator: copyJson(rt.curator || null, null)
    };
  }

// AIDA REVIEW BLOCK 11: Function checkpoint - callable behavior in this runtime organ.
  function checkpoint(reason = "runtime_checkpoint") {
    const rt = runtime();
    const state = ensureState();
    const store = storage();
    if (!store) {
      state.error = "localStorage_unavailable";
      return { ok: false, reason: state.error };
    }

    if (!hasWork(rt)) {
      return { ok: false, reason: "no_runtime_work" };
    }

    const snapshot = buildSnapshot(reason);
    try {
      store.setItem(state.key, JSON.stringify(snapshot));
      state.lastCheckpointAt = snapshot.savedAt;
      state.lastCheckpointReason = reason;
      state.error = null;
      return {
        ok: true,
        key: state.key,
        savedAt: snapshot.savedAt,
        reason,
        exchangeCount: snapshot.session?.currentTurns?.length || 0,
        pendingJournalCount: snapshot.sleep?.pendingJournal?.length || 0,
        summaryDraftCount: snapshot.contextEvolution?.summaryDrafts?.length || 0
      };
    } catch (error) {
      state.error = error.message;
      log(`CRASH BUFFER: checkpoint failed. ${error.message}`, "log-amber");
      return { ok: false, reason: error.message };
    }
  }

// AIDA REVIEW BLOCK 12: Function readSnapshot - callable behavior in this runtime organ.
  function readSnapshot() {
    const state = ensureState();
    const store = storage();
    if (!store) return null;
    const raw = store.getItem(state.key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      state.error = error.message;
      return null;
    }
  }

// AIDA REVIEW BLOCK 13: Function runtimeIsEmpty - callable behavior in this runtime organ.
  function runtimeIsEmpty(rt) {
    return !rt.session?.currentTurns?.length && !rt.sleep?.pendingJournal?.length;
  }

// AIDA REVIEW BLOCK 14: Function restore - callable behavior in this runtime organ.
  function restore(options = {}) {
    const rt = runtime();
    const state = ensureState();
    const snapshot = readSnapshot();
    if (!snapshot) return { ok: false, reason: "no_snapshot" };
    if (!options.force && !runtimeIsEmpty(rt)) {
      return { ok: false, reason: "runtime_not_empty", snapshot };
    }

    rt.session = copyJson(snapshot.session || rt.session, rt.session);
    rt.contextEvolution = {
      ...(rt.contextEvolution || {}),
      ...copyJson(snapshot.contextEvolution || {}, {})
    };
    rt.sleep = rt.sleep || {};
    rt.sleep.pendingJournal = copyJson(snapshot.sleep?.pendingJournal || [], []);
    rt.sleep.lastContextCheckpoint = copyJson(snapshot.sleep?.lastContextCheckpoint || null, null);
    if (snapshot.sleep?.lastActive) rt.sleep.lastActive = snapshot.sleep.lastActive;
    if (snapshot.librarian) {
      rt.librarian = {
        ...(rt.librarian || {}),
        ...copyJson(snapshot.librarian, {})
      };
    }
    if (snapshot.curator) {
      rt.curator = {
        ...(rt.curator || {}),
        ...copyJson(snapshot.curator, {})
      };
    }

    state.lastRestoredAt = nowIso();
    state.restored = true;
    state.error = null;
    log(`CRASH BUFFER: restored session=${rt.session?.id || "unknown"}, exchanges=${rt.session?.currentTurns?.length || 0}.`, "log-blue");
    return {
      ok: true,
      savedAt: snapshot.savedAt,
      restoredAt: state.lastRestoredAt,
      exchangeCount: rt.session?.currentTurns?.length || 0,
      pendingJournalCount: rt.sleep?.pendingJournal?.length || 0,
      summaryDraftCount: rt.contextEvolution?.summaryDrafts?.length || 0
    };
  }

// AIDA REVIEW BLOCK 15: Function clear - callable behavior in this runtime organ.
  function clear(reason = "manual_clear") {
    const state = ensureState();
    const store = storage();
    if (!store) return { ok: false, reason: "localStorage_unavailable" };
    store.removeItem(state.key);
    state.lastClearedAt = nowIso();
    state.lastClearReason = reason;
    return { ok: true, reason, clearedAt: state.lastClearedAt };
  }

// AIDA REVIEW BLOCK 16: Function inspect - callable behavior in this runtime organ.
  function inspect() {
    const state = ensureState();
    const snapshot = readSnapshot();
    const summary = {
      available: state.available,
      key: state.key,
      lastCheckpointAt: state.lastCheckpointAt || null,
      lastCheckpointReason: state.lastCheckpointReason || null,
      lastRestoredAt: state.lastRestoredAt || null,
      restored: Boolean(state.restored),
      error: state.error || null,
      snapshot: snapshot
        ? {
            savedAt: snapshot.savedAt,
            reason: snapshot.reason,
            sessionId: snapshot.session?.id || null,
            exchangeCount: snapshot.session?.currentTurns?.length || 0,
            pendingJournalCount: snapshot.sleep?.pendingJournal?.length || 0,
            summaryDraftCount: snapshot.contextEvolution?.summaryDrafts?.length || 0,
            projectLedgerDraftCount: snapshot.contextEvolution?.projectLedgerDrafts?.length || 0
          }
        : null
    };

    log("CRASH BUFFER: summary follows.", "log-blue");
    if (summary.snapshot) {
      log(`CRASH BUFFER: saved=${summary.snapshot.savedAt}, session=${summary.snapshot.sessionId}, exchanges=${summary.snapshot.exchangeCount}, drafts=${summary.snapshot.summaryDraftCount}`);
    } else {
      log("CRASH BUFFER: no saved snapshot.", "log-amber");
    }
    if (typeof console !== "undefined" && console.log) console.log("AIDA_CRASH_BUFFER_INSPECT", summary);
    return summary;
  }

// AIDA REVIEW BLOCK 17: Function install - callable behavior in this runtime organ.
  function install() {
    ensureState();
    const result = restore();
    if (result.ok) {
      log("Crash buffer organ loaded with recovered runtime work.", "log-blue");
    } else {
      log("Crash buffer organ loaded. Local session checkpoints enabled.", "log-blue");
    }
  }

// AIDA REVIEW BLOCK 18: Browser export AIDA_CRASH_BUFFER - exposes this organ to the page runtime.
  window.AIDA_CRASH_BUFFER = {
    checkpoint,
    restore,
    clear,
    inspect,
    readSnapshot
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "crash_recovery",
      reads: ["AIDA_RUNTIME.session", "AIDA_RUNTIME.contextEvolution", "AIDA_RUNTIME.sleep.pendingJournal"],
      writes: ["localStorage.AIDA_SPINE_CRASH_BUFFER_V1", "AIDA_RUNTIME.session", "AIDA_RUNTIME.contextEvolution", "AIDA_RUNTIME.sleep.pendingJournal"],
      requires: ["AIDA_RUNTIME"],
      verifies: ["long single-project sessions checkpoint to localStorage and can restore after hard reload before sleep"]
    });
  }

// AIDA REVIEW BLOCK 19: Browser event wiring - connects page lifecycle or user actions to this organ.
  document.addEventListener("DOMContentLoaded", install);
})();
