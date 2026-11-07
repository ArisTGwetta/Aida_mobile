// Local per-environment RECENT review receipts. Does not write to Drive or replace history search.
(function () {
  const key = (scope, id) => JSON.stringify([scope, id]);
  const copy = value => JSON.parse(JSON.stringify(value));
  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
    return value;
  }
  async function digest(record) {
    const bytes = new TextEncoder().encode(JSON.stringify(canonical(record)));
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), x => x.toString(16).padStart(2, "0")).join("");
  }
  const check = signal => { if (signal?.aborted) throw new Error("RECENT review cancelled; bookmark retained."); };
  function databaseStore(name = "AIDA_RECENT_REVIEW_V1") {
    let opened;
    function open() {
      if (!window.indexedDB) return Promise.reject(new Error("Local review storage is unavailable; bookmark was not advanced."));
      if (!opened) opened = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(name, 1);
        request.onupgradeneeded = () => {
          for (const storeName of ["meta", "files", "sources", "pending"]) {
            const store = request.result.createObjectStore(storeName, { keyPath: "key" });
            if (storeName === "pending") store.createIndex("scope", "scope");
          }
        };
        request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
        request.onerror = () => { opened = null; reject(request.error); };
        request.onblocked = () => reject(new Error("Local review storage is blocked; close another review tab and retry."));
      });
      return opened;
    }
    const request = value => new Promise((resolve, reject) => { value.onsuccess = () => resolve(value.result); value.onerror = () => reject(value.error); });
    async function transaction(names, mode, action) {
      const db = await open();
      const tx = db.transaction(names, mode);
      const done = new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onabort = () => reject(tx.error || new Error("Local review transaction aborted.")); tx.onerror = () => {}; });
      try { const value = await action(tx); await done; return value; }
      catch (error) { try { tx.abort(); } catch (_) {} await done.catch(() => {}); throw error; }
    }
    return {
      getMeta: scope => transaction(["meta"], "readonly", tx => request(tx.objectStore("meta").get(scope))),
      getFile: (scope, id) => transaction(["files"], "readonly", tx => request(tx.objectStore("files").get(key(scope, id)))),
      getPending: scope => transaction(["pending"], "readonly", tx => request(tx.objectStore("pending").index("scope").getAll(scope))),
      async commit(scope, generation, token, items, signal, rebuild = false) {
        return transaction(["meta", "files", "sources", "pending"], "readwrite", async tx => {
          const abort = () => { try { tx.abort(); } catch (_) {} };
          const cleanup = () => signal?.removeEventListener("abort", abort);
          signal?.addEventListener("abort", abort, { once: true });
          tx.addEventListener("complete", cleanup, { once: true });
          tx.addEventListener("abort", cleanup, { once: true });
          check(signal);
          const metaStore = tx.objectStore("meta"), files = tx.objectStore("files"), sources = tx.objectStore("sources"), pending = tx.objectStore("pending");
          const prior = await request(metaStore.get(scope));
          if ((prior?.generation || 0) !== generation) throw new Error("Another review advanced this environment; retry from its saved bookmark.");
          const windowRecords = new Map((prior?.window || []).map(r => [r.turn_id, r]));
          for (const item of items) {
            check(signal);
            const oldFile = await request(files.get(key(scope, item.file.id)));
            const oldSource = await request(sources.get(key(scope, item.record.turn_id)));
            if ((oldFile && oldFile.digest !== item.digest) || (oldSource && oldSource.digest !== item.digest)) throw new Error("A reviewed RECENT source changed or conflicts with its saved identity.");
            files.put({ key: key(scope, item.file.id), scope, id: item.file.id, digest: item.digest, version: item.version, turnId: item.record.turn_id });
            sources.put({ key: key(scope, item.record.turn_id), scope, turnId: item.record.turn_id, digest: item.digest });
            if (!item.diagnostic && item.record.status === "completed_model_reply") {
              if (!oldSource) pending.put({ key: key(scope, item.record.turn_id), scope, turnId: item.record.turn_id, record: item.record });
              windowRecords.set(item.record.turn_id, { ...item.record, drive_name: item.file.name, drive_modifiedTime: item.file.modifiedTime || null });
            }
          }
          check(signal);
          const window = Array.from(windowRecords.values()).sort((a, b) => String(a.effective_at).localeCompare(String(b.effective_at)) || a.turn_id.localeCompare(b.turn_id)).slice(-64);
          const meta = { key: scope, generation: generation + 1, token, window, lastReviewedAt: new Date().toISOString(), baseline: rebuild };
          metaStore.put(meta);
          return meta;
        });
      },
      prune: (scope, ids) => transaction(["pending"], "readwrite", tx => { for (const id of ids) tx.objectStore("pending").delete(key(scope, id)); })
    };
  }
  function create({ store = databaseStore(), hash = digest } = {}) {
    const locks = new Map();
    async function run(options) {
      const { scope, signal } = options;
      check(signal);
      const prior = await store.getMeta(scope);
      let start = prior?.token;
      const files = new Map();
      let baseline = !start || options.fullReconcile === true;
      if (baseline) {
        start = await options.getStartToken(); // Obtain before listing so concurrent/late uploads remain discoverable.
        for (const file of await options.listBaseline()) files.set(file.id, file);
      }
      let token = start, finalToken;
      const visited = new Set();
      try {
        do {
          check(signal);
          if (visited.has(token)) throw new Error("RECENT change pagination repeated a token.");
          visited.add(token);
          const page = await options.listChanges(token);
          for (const change of page.changes || []) {
            if (change.removed || change.file?.trashed) {
              if (files.has(change.fileId) || await store.getFile(scope, change.fileId)) throw new Error("A reviewed source was removed; bookmark retained for reconciliation.");
              continue;
            }
            if (change.file && options.isSource(change.file)) files.set(change.fileId, { ...change.file, id: change.fileId });
            else if (await store.getFile(scope, change.fileId)) throw new Error("A reviewed source moved outside RECENT; bookmark retained for reconciliation.");
          }
          token = page.nextPageToken;
          if (!token) finalToken = page.newStartPageToken;
        } while (token);
      } catch (error) {
        // A rejected cursor gets one explicit full baseline, never a timestamp-only shortcut.
        if (!baseline && error.status === 410) return run({ ...options, fullReconcile: true });
        throw error;
      }
      if (!finalToken) throw new Error("RECENT change feed has no final bookmark; review retained for retry.");
      const work = [];
      for (const file of files.values()) {
        const version = file.md5Checksum || file.modifiedTime || null;
        const receipt = await store.getFile(scope, file.id);
        if (baseline || !receipt || !version || receipt.version !== version) work.push({ file, version });
      }
      const items = new Array(work.length), pool = new AbortController();
      const abort = () => pool.abort();
      let next = 0, error = null, reviewed = 0;
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) pool.abort();
      try {
        const worker = async () => {
          while (!pool.signal.aborted && next < work.length) {
            const index = next++, item = work[index];
            try {
              const record = await options.fetchRecord(item.file, pool.signal, reviewed, work.length);
              options.validate(record, item.file);
              const checksum = await hash(record);
              check(pool.signal);
              items[index] = { ...item, record, digest: checksum, diagnostic: options.isDiagnostic(record) };
              reviewed++;
              options.onProgress?.({ message: "Reviewed " + reviewed + " of " + work.length + " new or changed conversation records", completed: reviewed, total: work.length });
            } catch (failure) { if (!error) error = failure; pool.abort(); }
          }
        };
        await Promise.all(Array.from({ length: Math.min(4, work.length) }, worker));
        if (error) throw error;
        check(signal);
        if (reviewed !== work.length) throw new Error("RECENT review incomplete; bookmark retained.");
      } finally { signal?.removeEventListener("abort", abort); pool.abort(); }
      const meta = await store.commit(scope, prior?.generation || 0, finalToken, items, signal, baseline);
      return { scope, meta, reviewed, baseline, pending: (await store.getPending(scope)).map(x => x.record) };
    }
    return {
      refresh(options) {
        const previous = locks.get(options.scope) || Promise.resolve();
        const operation = previous.catch(() => {}).then(() => run(options));
        locks.set(options.scope, operation);
        operation.finally(() => { if (locks.get(options.scope) === operation) locks.delete(options.scope); }).catch(() => {});
        return operation;
      },
      pruneCommitted: (scope, ids) => store.prune(scope, ids),
      inspect: scope => store.getMeta(scope)
    };
  }
  window.AIDA_RECENT_REVIEW = { create, databaseStore, engine: create(), canonical };
})();
