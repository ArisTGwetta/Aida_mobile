(function () {
  const MODULE_ID = "spine.crawler";
  const DEFAULT_KEY = "AIDA_CRAWLER_INDEX_V1";
  const DEFAULT_RECALL_MIN_SCORE = 6;

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

  function storage() {
    try {
      if (!window.localStorage) return null;
      const probe = "__aida_crawler_probe__";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch (error) {
      return null;
    }
  }

  function ensureState() {
    const rt = runtime();
    rt.crawler = rt.crawler || {};
    rt.crawler.key = rt.crawler.key || DEFAULT_KEY;
    rt.crawler.entries = rt.crawler.entries || [];
    rt.crawler.searches = rt.crawler.searches || [];
    return rt.crawler;
  }

  function cleanText(text, limit = 1600) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, limit);
  }

  function slug(value, fallback = "entry") {
    return String(value || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 90) || fallback;
  }

  function tokenSet(text) {
    const stop = new Set(["the", "and", "for", "that", "this", "with", "you", "aida", "are", "was", "were", "have", "from", "into", "will", "should"]);
    return [...new Set(String(text || "")
      .toLowerCase()
      .match(/[a-z0-9_]{3,}/g) || [])]
      .filter((token) => !stop.has(token));
  }

  function consoleReport(label, value) {
    if (typeof console === "undefined" || !console.log) return;
    try {
      console.log(label, copyJson(value, value));
    } catch (error) {
      console.log(label, value);
    }
  }

  function entry(id, type, title, text, meta = {}) {
    const cleaned = cleanText(text);
    if (!cleaned) return null;
    return {
      id,
      type,
      title: cleanText(title, 180) || type,
      text: cleaned,
      tokens: tokenSet(`${title} ${cleaned}`),
      sourceRefs: safeArray(meta.sourceRefs),
      reviewWindow: meta.reviewWindow || null,
      project: meta.project || null,
      realm: meta.realm || null,
      packetId: meta.packetId || null,
      humanSource: meta.humanSource || null,
      indexedAt: meta.indexedAt || nowIso()
    };
  }

  function sessionEntries(rt, indexedAt) {
    return safeArray(rt.session?.currentTurns).flatMap((turn) => {
      const tags = turn.tags || {};
      const sourceRef = `${tags.session_id || rt.session?.id || "session"}#turn_${turn.turnIndex}`;
      return [
        entry(
          `raw_turn_user_${slug(sourceRef)}`,
          "raw_turn_user",
          `User turn ${turn.turnIndex}`,
          turn.user?.text,
          {
            sourceRefs: [sourceRef],
            project: tags.project,
            realm: tags.realm,
            humanSource: "AIDA_RUNTIME.session.currentTurns",
            indexedAt
          }
        ),
        entry(
          `raw_turn_aida_${slug(sourceRef)}`,
          "raw_turn_aida",
          `Aida turn ${turn.turnIndex}`,
          turn.aida?.text,
          {
            sourceRefs: [sourceRef],
            project: tags.project,
            realm: tags.realm,
            humanSource: "AIDA_RUNTIME.session.currentTurns",
            indexedAt
          }
        )
      ].filter(Boolean);
    });
  }

  function librarianEntries(staged, indexedAt) {
    const entries = [];
    safeArray(staged.diaryDrafts).forEach((item) => {
      const windowInfo = item.review_window || null;
      const windowText = windowInfo
        ? ` Review window: session ${windowInfo.session_id || item.session_id || "unknown"}, turns ${windowInfo.turn_start ?? "?"}-${windowInfo.turn_end ?? "?"}, ${windowInfo.startedAt || "unknown_start"} to ${windowInfo.endedAt || "unknown_end"}.`
        : "";
      entries.push(entry(
        `diary_${slug(item.id)}`,
        "diary_draft",
        `Diary: ${item.project || "project"}`,
        `${item.entry || ""}${windowText}`,
        {
          sourceRefs: item.source_refs,
          reviewWindow: windowInfo,
          project: item.project,
          realm: item.realm,
          packetId: item.packetId,
          humanSource: "AIDA_RUNTIME.librarian.diaryDrafts",
          indexedAt
        }
      ));
    });
    safeArray(staged.rollingSummaryDrafts).forEach((item) => entries.push(entry(
      `rolling_${slug(item.id)}`,
      "rolling_summary",
      item.scope || "Rolling summary",
      item.text,
      {
        sourceRefs: item.source_refs,
        project: item.scope?.replace(/^project:/, ""),
        packetId: item.packetId,
        humanSource: "AIDA_RUNTIME.librarian.rollingSummaryDrafts",
        indexedAt
      }
    )));
    safeArray(staged.longSummaryDrafts).forEach((item) => entries.push(entry(
      `long_${slug(item.id)}`,
      "long_summary_candidate",
      item.scope || "Long summary",
      item.text,
      {
        sourceRefs: item.source_refs,
        project: item.scope?.replace(/^project:/, ""),
        packetId: item.packetId,
        humanSource: "AIDA_RUNTIME.librarian.longSummaryDrafts",
        indexedAt
      }
    )));
    safeArray(staged.factCandidates).forEach((item) => entries.push(entry(
      `fact_${slug(item.id)}`,
      "fact_candidate",
      item.scope || "Fact candidate",
      item.claim,
      {
        sourceRefs: item.source_refs,
        project: item.scope?.replace(/^project:/, ""),
        packetId: item.packetId,
        humanSource: "AIDA_RUNTIME.librarian.factCandidates",
        indexedAt
      }
    )));
    safeArray(staged.insightCandidates).forEach((item) => entries.push(entry(
      `insight_${slug(item.id)}`,
      "insight_candidate",
      item.scope || "Insight candidate",
      item.guidance,
      {
        sourceRefs: item.derived_from,
        project: item.scope?.replace(/^project:/, ""),
        packetId: item.packetId,
        humanSource: "AIDA_RUNTIME.librarian.insightCandidates",
        indexedAt
      }
    )));
    safeArray(staged.sensitiveContextCandidates).forEach((item) => entries.push(entry(
      `sensitive_${slug(item.id)}`,
      "sensitive_context_candidate",
      item.scope || "Sensitive context",
      item.note || item.context || item.claim || "",
      {
        sourceRefs: item.source_refs,
        project: item.scope?.replace(/^project:/, ""),
        packetId: item.packetId,
        humanSource: "AIDA_RUNTIME.librarian.sensitiveContextCandidates",
        indexedAt
      }
    )));
    safeArray(staged.salutationSignals).forEach((item) => entries.push(entry(
      `salutation_${slug(item.id)}`,
      "salutation_tone_signal",
      "Salutation and tone signal",
      `${item.observed_text || ""} ${item.suggested_use || item.guidance || ""}`,
      {
        sourceRefs: item.source_ref ? [item.source_ref] : item.source_refs,
        packetId: item.packetId,
        humanSource: "AIDA_RUNTIME.librarian.salutationSignals",
        indexedAt
      }
    )));
    safeArray(staged.rawLogEntries).forEach((item) => entries.push(entry(
      `raw_log_${slug(item.id)}`,
      "raw_session_log",
      `Raw turn ${item.turnIndex ?? "?"}`,
      `User: ${item.user || ""} Aida: ${item.aida || ""}`,
      {
        sourceRefs: item.source_refs,
        project: item.project,
        realm: item.realm,
        packetId: item.packetId,
        humanSource: "AIDA_RUNTIME.librarian.rawLogEntries",
        indexedAt
      }
    )));
    return entries.filter(Boolean);
  }

  function curatorEntries(reviewed, indexedAt) {
    const entries = [];
    safeArray(reviewed.projectListingDrafts).forEach((item) => entries.push(entry(
      `project_listing_${slug(item.id)}`,
      "project_listing_draft",
      item.project?.name || "Project listing",
      `${item.latest_summary || ""} ${item.latest_status || ""}`,
      {
        project: item.project?.name,
        realm: item.project?.realm,
        packetId: item.sourcePacketId,
        humanSource: "AIDA_RUNTIME.curator.projectListingDrafts",
        indexedAt
      }
    )));
    safeArray(reviewed.writePlanDrafts).forEach((item) => entries.push(entry(
      `write_plan_${slug(item.id)}`,
      "write_plan_draft",
      "Drive write plan draft",
      JSON.stringify(item.writes || {}),
      {
        humanSource: "AIDA_RUNTIME.curator.writePlanDrafts",
        indexedAt
      }
    )));
    safeArray(reviewed.needsConfirmation).forEach((item) => entries.push(entry(
      `needs_confirmation_${slug(item.id)}`,
      "needs_confirmation",
      item.scope || "Needs confirmation",
      item.claim || item.guidance,
      {
        sourceRefs: item.source_refs || item.derived_from,
        project: item.scope?.replace(/^project:/, ""),
        packetId: item.packetId,
        humanSource: "AIDA_RUNTIME.curator.needsConfirmation",
        indexedAt
      }
    )));
    return entries.filter(Boolean);
  }

  function upsertEntries(state, entries) {
    entries.forEach((item) => {
      const index = state.entries.findIndex((existing) => existing.id === item.id);
      if (index >= 0) state.entries[index] = item;
      else state.entries.push(item);
    });
    state.entries = state.entries.slice(-1200);
  }

  function persist(state) {
    const store = storage();
    if (!store) return false;
    store.setItem(state.key, JSON.stringify({
      version: 1,
      savedAt: nowIso(),
      entries: state.entries
    }));
    return true;
  }

  function loadPersisted() {
    const state = ensureState();
    const store = storage();
    if (!store) return { ok: false, reason: "localStorage_unavailable" };
    const raw = store.getItem(state.key);
    if (!raw) return { ok: false, reason: "no_index" };
    try {
      const parsed = JSON.parse(raw);
      state.entries = safeArray(parsed.entries);
      state.lastLoadedAt = nowIso();
      return { ok: true, entryCount: state.entries.length, savedAt: parsed.savedAt || null };
    } catch (error) {
      return { ok: false, reason: error.message };
    }
  }

  function indexNow(reason = "manual_index") {
    const rt = runtime();
    const state = ensureState();
    const indexedAt = nowIso();
    const staged = window.AIDA_LIBRARIAN?.getStaged?.() || {};
    const reviewed = window.AIDA_CURATOR?.getReviewed?.() || {};
    const entries = [
      ...sessionEntries(rt, indexedAt),
      ...librarianEntries(staged, indexedAt),
      ...curatorEntries(reviewed, indexedAt)
    ];

    upsertEntries(state, entries);
    state.lastIndexedAt = indexedAt;
    state.lastIndexedReason = reason;
    const persisted = persist(state);
    const summary = safeSummary();
    log(`CRAWLER: indexed ${entries.length} source item(s), total=${summary.entryCount}.`, "log-blue");
    consoleReport("AIDA_CRAWLER_INDEXED", { ...summary, persisted, reason });
    return { ready: true, entriesAdded: entries.length, persisted, summary };
  }

  function scoreEntry(queryTokens, item) {
    if (!queryTokens.length) return 0;
    const itemTokens = new Set(item.tokens || tokenSet(`${item.title} ${item.text}`));
    let score = 0;
    queryTokens.forEach((token) => {
      if (itemTokens.has(token)) score += 4;
      if (String(item.title || "").toLowerCase().includes(token)) score += 3;
      if (String(item.text || "").toLowerCase().includes(token)) score += 1;
      if (String(item.project || "").toLowerCase().includes(token)) score += 2;
    });

    const typeBoosts = {
      fact_candidate: 2,
      insight_candidate: 2,
      diary_draft: 1.5,
      project_listing_draft: 1.5,
      rolling_summary: 1,
      long_summary_candidate: 1
    };
    return score + (typeBoosts[item.type] || 0);
  }

  function search(query, options = {}) {
    const state = ensureState();
    if (!state.entries.length) loadPersisted();
    const tokens = tokenSet(query);
    const limit = Number(options.limit || 5);
    const minScore = Number(options.minScore || 1);
    const project = options.project ? String(options.project).toLowerCase() : null;
    const results = state.entries
      .filter((item) => !project || String(item.project || "").toLowerCase() === project)
      .map((item) => ({
        ...item,
        score: scoreEntry(tokens, item)
      }))
      .filter((item) => item.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        text: item.text,
        score: item.score,
        sourceRefs: item.sourceRefs,
        reviewWindow: item.reviewWindow,
        project: item.project,
        humanSource: item.humanSource,
        packetId: item.packetId
      }));

    const searchedAt = nowIso();
    state.searches.push({ query, searchedAt, resultCount: results.length, minScore });
    state.searches = state.searches.slice(-30);
    consoleReport("AIDA_CRAWLER_SEARCH", { query, resultCount: results.length, minScore, results });
    return { query, searchedAt, minScore, results };
  }

  function remember(query, options = {}) {
    const minScore = Number(options.minScore || DEFAULT_RECALL_MIN_SCORE);
    const result = search(query, { ...options, minScore });
    if (!result.results.length) {
      return {
        found: false,
        confidence: "none",
        strict: true,
        reply: "I do not know that from indexed memory yet. I can meditate on it and search the mind palace more deliberately.",
        ...result
      };
    }
    const top = result.results[0];
    return {
      found: true,
      confidence: top.score >= minScore + 4 ? "strong" : "bounded",
      strict: true,
      reply: `Yes, I found it in my mind palace. ${top.title}: ${top.text}`,
      top,
      ...result
    };
  }

  function safeSummary() {
    const state = ensureState();
    return {
      ready: Boolean(state.entries.length),
      entryCount: state.entries.length,
      lastIndexedAt: state.lastIndexedAt || null,
      lastIndexedReason: state.lastIndexedReason || null,
      searchCount: state.searches.length,
      types: state.entries.reduce((counts, item) => {
        counts[item.type] = (counts[item.type] || 0) + 1;
        return counts;
      }, {})
    };
  }

  function inspect() {
    const summary = safeSummary();
    log("CRAWLER: index summary follows.", "log-blue");
    log(`CRAWLER: entries=${summary.entryCount}, indexed=${summary.lastIndexedAt || "never"}, searches=${summary.searchCount}`);
    consoleReport("AIDA_CRAWLER_INSPECT", summary);
    return summary;
  }

  function install() {
    ensureState();
    const loaded = loadPersisted();
    log(`Crawler organ loaded. Search is on demand. ${loaded.ok ? `Loaded ${loaded.entryCount} indexed item(s).` : "No persisted index loaded."}`, "log-blue");
  }

  window.AIDA_CRAWLER = {
    indexNow,
    search,
    remember,
    inspect,
    safeSummary,
    loadPersisted
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "memory_retrieval",
      reads: ["AIDA_RUNTIME.session", "AIDA_RUNTIME.librarian", "AIDA_RUNTIME.curator"],
      writes: ["AIDA_RUNTIME.crawler.entries", "localStorage.AIDA_CRAWLER_INDEX_V1"],
      requires: ["AIDA_RUNTIME"],
      verifies: ["human-readable memory remains source of truth while compact searchable sidecar indexes are built automatically and searched on demand"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
