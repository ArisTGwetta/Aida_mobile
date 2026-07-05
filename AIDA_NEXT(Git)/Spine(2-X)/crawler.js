// AIDA REVIEW BLOCK 1: File header - AIDA_ONE_SPINE\spine\crawler.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
(function () {
  const MODULE_ID = "spine.crawler";
  const DEFAULT_KEY = "AIDA_CRAWLER_INDEX_V1";
  const DEFAULT_RECALL_MIN_SCORE = 6;

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

// AIDA REVIEW BLOCK 8: Function storage - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 9: Function ensureState - callable behavior in this runtime organ.
  function ensureState() {
    const rt = runtime();
    rt.crawler = rt.crawler || {};
    rt.crawler.key = rt.crawler.key || DEFAULT_KEY;
    rt.crawler.entries = rt.crawler.entries || [];
    rt.crawler.searches = rt.crawler.searches || [];
    return rt.crawler;
  }

// AIDA REVIEW BLOCK 10: Function cleanText - callable behavior in this runtime organ.
  function cleanText(text, limit = 1600) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, limit);
  }

// AIDA REVIEW BLOCK 11: Function slug - callable behavior in this runtime organ.
  function slug(value, fallback = "entry") {
    return String(value || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 90) || fallback;
  }

// AIDA REVIEW BLOCK 12: Function tokenSet - callable behavior in this runtime organ.
  function tokenSet(text) {
    const stop = new Set(["the", "and", "for", "that", "this", "with", "you", "aida", "are", "was", "were", "have", "from", "into", "will", "should"]);
    return [...new Set(String(text || "")
      .toLowerCase()
      .match(/[a-z0-9_]{3,}/g) || [])]
      .filter((token) => !stop.has(token));
  }

// AIDA REVIEW BLOCK 13: Function consoleReport - callable behavior in this runtime organ.
  function consoleReport(label, value) {
    if (typeof console === "undefined" || !console.log) return;
    try {
      console.log(label, copyJson(value, value));
    } catch (error) {
      console.log(label, value);
    }
  }

// AIDA REVIEW BLOCK 14: Function entry - callable behavior in this runtime organ.
  function entry(id, type, title, text, meta = {}) {
    const cleaned = cleanText(text);
    if (!cleaned) return null;
    const llm = window.AIDA_LLM_SCOPE?.from?.(meta, meta.llmFallback || "shared") || {
      provider: meta.llmProvider || null,
      profile: meta.llmProfile || null,
      model: meta.llmModel || null,
      scope: meta.llmScope || meta.llmFallback || "shared"
    };
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
      llmProvider: llm.provider,
      llmProfile: llm.profile,
      llmModel: llm.model,
      llmScope: llm.scope,
      indexedAt: meta.indexedAt || nowIso()
    };
  }

// AIDA REVIEW BLOCK 15: Function sessionEntries - callable behavior in this runtime organ.
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
            llm_provider: tags.llm_provider,
            llm_profile: tags.llm_profile,
            llm_model: tags.llm_model,
            llm_scope: tags.llm_scope,
            llmFallback: "legacy",
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
            llm_provider: tags.llm_provider,
            llm_profile: tags.llm_profile,
            llm_model: tags.llm_model,
            llm_scope: tags.llm_scope,
            llmFallback: "legacy",
            humanSource: "AIDA_RUNTIME.session.currentTurns",
            indexedAt
          }
        )
      ].filter(Boolean);
    });
  }

// AIDA REVIEW BLOCK 16: Function driveRecordText - callable behavior in this runtime organ.
  function driveRecordText(record) {
    if (record === null || record === undefined) return "";
    if (typeof record === "string") return cleanText(record);
    if (typeof record !== "object") return cleanText(String(record));

    const parts = [
      record.claim,
      record.guidance,
      record.note,
      record.entry,
      record.text,
      record.summary,
      record.latest_summary,
      record.latest_status,
      record.status,
      record.user,
      record.aida,
      record.observed_text,
      record.suggested_use,
      record.thread,
      record.handling
    ].filter((value) => typeof value === "string" && value.trim());

    return cleanText(parts.join(" "), 2200);
  }

// AIDA REVIEW BLOCK 17: Function driveRecordList - callable behavior in this runtime organ.
  function driveRecordList(name, data) {
    if (!data || typeof data !== "object") return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.entries)) return data.entries;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.candidates)) return data.candidates;
    if (Array.isArray(data.signals)) return data.signals;
    if (Array.isArray(data.turns)) return data.turns;
    if (Array.isArray(data.recent_turns)) return data.recent_turns;
    if (data.projects && typeof data.projects === "object") {
      return Object.entries(data.projects).map(([key, value]) => ({
        ...(value && typeof value === "object" ? value : { text: value }),
        _recordKey: key
      }));
    }

    const results = [];
// AIDA REVIEW BLOCK 18: Function visit - callable behavior in this runtime organ.
    function visit(value, path, depth = 0) {
      if (value === null || value === undefined || depth > 6) return;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        const text = cleanText(String(value));
        if (text) results.push({ _recordKey: path, text });
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, `${path}.${index + 1}`, depth + 1));
        return;
      }
      if (typeof value !== "object") return;

      const directText = driveRecordText(value);
      if (directText) {
        results.push({ ...value, _recordKey: path });
        return;
      }
      Object.entries(value).forEach(([key, item]) => {
        if (key === "last_updated" || key.startsWith("__")) return;
        visit(item, path ? `${path}.${key}` : key, depth + 1);
      });
    }

    visit(data, name.replace(/\.json$/i, ""));
    return results;
  }

// AIDA REVIEW BLOCK 19: Function driveType - callable behavior in this runtime organ.
  function driveType(name) {
    if (name === "raw_session_log.json" || name === "session_log.json" || name === "recent_turns.json") return "drive_raw_log";
    if (name === "diary_log.json") return "drive_diary";
    if (name === "project_summary.json" || name.startsWith("project_briefcase_")) return "drive_project_memory";
    if (name === "facts.json") return "drive_fact";
    if (name === "facts_candidates.json") return "drive_fact_candidate";
    if (name === "insights.json") return "drive_insight";
    if (name === "insights_candidates.json") return "drive_insight_candidate";
    if (name === "memory_summary.json") return "drive_memory_summary";
    if (name === "sensitive_context_candidates.json") return "drive_sensitive_candidate";
    if (name === "salutation_tone_signals.json") return "drive_tone_signal";
    return "drive_memory";
  }

// AIDA REVIEW BLOCK 20: Function skipDriveCandidate - callable behavior in this runtime organ.
  function skipDriveCandidate(name, record) {
    if (!/_candidates\.json$/i.test(name)) return false;
    return record?.source === "fallback" || record?.method === "deterministic_runtime_draft";
  }

// AIDA REVIEW BLOCK 21: Function driveFallbackScope - callable behavior in this runtime organ.
  function driveFallbackScope(name) {
    return /^(facts|insights|memory_summary)\.json$/i.test(name) ? "shared" : "legacy";
  }

// AIDA REVIEW BLOCK 22: Function driveEntries - callable behavior in this runtime organ.
  function driveEntries(rt, indexedAt) {
    const files = rt.drive?.files || {};
    const allowed = /^(raw_session_log|session_log|recent_turns|diary_log|project_summary|project_briefcase_.+|facts|facts_candidates|insights|insights_candidates|memory_summary|sensitive_context_candidates|salutation_tone_signals)\.json$/i;
    const results = [];

    Object.entries(files).forEach(([name, data]) => {
      if (!allowed.test(name)) return;
      const type = driveType(name);
      driveRecordList(name, data).forEach((record, index) => {
        if (skipDriveCandidate(name, record)) return;
        const text = driveRecordText(record);
        if (!text) return;
        const sourceRefs = safeArray(record?.source_refs || record?.sourceRefs);
        const project = record?.project || record?.project_name || record?.scope?.replace(/^project:/, "") || record?._recordKey || null;
        const title = record?.title || record?.claim || record?.project_name || record?._recordKey || `${name} item ${index + 1}`;
        results.push(entry(
          `drive_${slug(name)}_${slug(record?.id || record?._recordKey || index + 1)}`,
          type,
          title,
          text,
          {
            sourceRefs,
            reviewWindow: record?.review_window || null,
            project,
            realm: record?.realm || null,
            packetId: record?.packetId || record?.sourcePacketId || null,
            llm_provider: record?.llm_provider || record?.tags?.llm_provider,
            llm_profile: record?.llm_profile || record?.tags?.llm_profile,
            llm_model: record?.llm_model || record?.tags?.llm_model,
            llm_scope: record?.llm_scope || record?.tags?.llm_scope,
            llmFallback: driveFallbackScope(name),
            humanSource: `AIDA_RUNTIME.drive.files["${name}"]`,
            indexedAt
          }
        ));
      });
    });

    return results.filter(Boolean);
  }

// AIDA REVIEW BLOCK 23: Function librarianEntries - callable behavior in this runtime organ.
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
          ...item,
          llmFallback: window.AIDA_LLM_SCOPE?.current?.().provider || "shared",
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
        ...item,
        llmFallback: window.AIDA_LLM_SCOPE?.current?.().provider || "shared",
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
        ...item,
        llmFallback: window.AIDA_LLM_SCOPE?.current?.().provider || "shared",
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
        ...item,
        llmFallback: window.AIDA_LLM_SCOPE?.current?.().provider || "shared",
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
        ...item,
        llmFallback: window.AIDA_LLM_SCOPE?.current?.().provider || "shared",
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
        ...item,
        llmFallback: window.AIDA_LLM_SCOPE?.current?.().provider || "shared",
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
        ...item,
        llmFallback: window.AIDA_LLM_SCOPE?.current?.().provider || "shared",
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
        ...item,
        llmFallback: window.AIDA_LLM_SCOPE?.current?.().provider || "shared",
        humanSource: "AIDA_RUNTIME.librarian.rawLogEntries",
        indexedAt
      }
    )));
    return entries.filter(Boolean);
  }

// AIDA REVIEW BLOCK 24: Function curatorEntries - callable behavior in this runtime organ.
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
        ...item,
        llmFallback: window.AIDA_LLM_SCOPE?.current?.().provider || "shared",
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
        ...item,
        llmFallback: window.AIDA_LLM_SCOPE?.current?.().provider || "shared",
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
        ...item,
        llmFallback: window.AIDA_LLM_SCOPE?.current?.().provider || "shared",
        humanSource: "AIDA_RUNTIME.curator.needsConfirmation",
        indexedAt
      }
    )));
    return entries.filter(Boolean);
  }

// AIDA REVIEW BLOCK 25: Function upsertEntries - callable behavior in this runtime organ.
  function upsertEntries(state, entries) {
    entries.forEach((item) => {
      const index = state.entries.findIndex((existing) => existing.id === item.id);
      if (index >= 0) state.entries[index] = item;
      else state.entries.push(item);
    });
    state.entries = state.entries.slice(-1200);
  }

// AIDA REVIEW BLOCK 26: Function persist - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 27: Function loadPersisted - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 28: Function indexNow - callable behavior in this runtime organ.
  function indexNow(reason = "manual_index") {
    const rt = runtime();
    const state = ensureState();
    const indexedAt = nowIso();
    const staged = window.AIDA_LIBRARIAN?.getStaged?.() || {};
    const reviewed = window.AIDA_CURATOR?.getReviewed?.() || {};
    const entries = [
      ...sessionEntries(rt, indexedAt),
      ...driveEntries(rt, indexedAt),
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

// AIDA REVIEW BLOCK 29: Function scoreEntry - callable behavior in this runtime organ.
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
      drive_fact: 2.5,
      drive_insight: 2.5,
      drive_fact_candidate: 0.5,
      drive_insight_candidate: 0.5,
      drive_diary: 2,
      drive_raw_log: 1.5,
      drive_project_memory: 1.5,
      drive_memory_summary: 1.5,
      drive_sensitive_candidate: 0.25,
      diary_draft: 1.5,
      project_listing_draft: 1.5,
      rolling_summary: 1,
      long_summary_candidate: 1
    };
    return score + (typeBoosts[item.type] || 0);
  }

// AIDA REVIEW BLOCK 30: Function search - callable behavior in this runtime organ.
  function search(query, options = {}) {
    const state = ensureState();
    if (!state.entries.length) loadPersisted();
    const tokens = tokenSet(query);
    const limit = Number(options.limit || 5);
    const minScore = Number(options.minScore || 1);
    const project = options.project ? String(options.project).toLowerCase() : null;
    const llmScope = options.llmScope || "current";
    const results = state.entries
      .filter((item) => !project || String(item.project || "").toLowerCase() === project)
      .filter((item) => window.AIDA_LLM_SCOPE?.allows?.(item, {
        scope: llmScope,
        provider: options.llmProvider,
        fallback: item.llmScope || "legacy"
      }) ?? true)
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
        packetId: item.packetId,
        llmProvider: item.llmProvider,
        llmProfile: item.llmProfile,
        llmScope: item.llmScope
      }));

    const searchedAt = nowIso();
    state.searches.push({
      query,
      searchedAt,
      resultCount: results.length,
      minScore,
      llmScope,
      llmProvider: options.llmProvider || window.AIDA_LLM_SCOPE?.current?.().provider || null
    });
    state.searches = state.searches.slice(-30);
    consoleReport("AIDA_CRAWLER_SEARCH", { query, resultCount: results.length, minScore, results });
    return { query, searchedAt, minScore, results };
  }

// AIDA REVIEW BLOCK 31: Function entriesForCurrentLlm - callable behavior in this runtime organ.
  function entriesForCurrentLlm(options = {}) {
    const state = ensureState();
    if (!state.entries.length) loadPersisted();
    const limit = Number(options.limit || 24);
    return state.entries
      .filter((item) => window.AIDA_LLM_SCOPE?.allows?.(item, {
        provider: options.llmProvider,
        fallback: item.llmScope || "legacy"
      }) ?? true)
      .slice(-limit);
  }

// AIDA REVIEW BLOCK 32: Function glanceText - callable behavior in this runtime organ.
  function glanceText(item, limit = 190) {
    const text = cleanText(item?.text, limit);
    if (!text || text === "[object Object]") return "";
    if (
      /^Across \d+ exchange\(s\)/i.test(text) ||
      /^In [^,]+, the user raised:/i.test(text) ||
      /\bReview window: session\b/i.test(text) ||
      /\bDurable candidates should stay tied\b/i.test(text)
    ) return "";
    return text.replace(/\s*(?:\.\.\.|[.!?]+)$/, "").trim();
  }

// AIDA REVIEW BLOCK 33: Function freshGlance - callable behavior in this runtime organ.
  function freshGlance(options = {}) {
    indexNow("fresh_glance");
    const state = ensureState();
    const activeProject = options.allProjects
      ? ""
      : slug(
          options.project ||
          runtime().context?.project?.project_name ||
          runtime().context?.project?.name ||
          runtime().mind?.activeProject?.project_name ||
          runtime().mind?.activeProject?.name ||
          "",
          ""
        );
    const scope = options.llmScope || "current";
    const visible = state.entries
      .filter((item) => window.AIDA_LLM_SCOPE?.allows?.(item, {
        scope,
        provider: options.llmProvider,
        fallback: item.llmScope || "legacy"
      }) ?? true)
      .filter((item) => !activeProject || slug(item.project || "", "") === activeProject)
      .slice(-80)
      .reverse();

    const priorities = [
      ["project", ["drive_project_memory", "project_listing_draft", "rolling_summary", "long_summary_candidate"]],
      ["insight", ["drive_insight", "insight_candidate"]],
      ["fact", ["drive_fact", "fact_candidate"]],
      ["diary", ["drive_diary", "diary_draft"]],
      ["conversation", ["drive_raw_log", "raw_turn_user", "raw_turn_aida"]]
    ];
    const used = new Set();
    const threads = [];
    for (const [kind, types] of priorities) {
      const match = visible.find((item) => {
        const text = glanceText(item);
        if (!types.includes(item.type) || !text) return false;
        const key = text.toLowerCase();
        if (used.has(key)) return false;
        used.add(key);
        return true;
      });
      if (!match) continue;
      threads.push({
        kind,
        text: glanceText(match),
        project: match.project || null,
        sourceRefs: safeArray(match.sourceRefs).slice(0, 3),
        type: match.type
      });
      if (threads.length >= Number(options.limit || 3)) break;
    }

    const provider = window.AIDA_LLM_SCOPE?.current?.().provider || null;
    const response = {
      ready: true,
      reviewedAt: nowIso(),
      provider,
      scope,
      project: activeProject || null,
      threadCount: threads.length,
      threads,
      sourceRefCount: new Set(threads.flatMap((item) => item.sourceRefs)).size
    };
    state.lastFreshGlance = response;
    consoleReport("AIDA_CRAWLER_FRESH_GLANCE", response);
    return response;
  }

// AIDA REVIEW BLOCK 34: Function remember - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 35: Function safeSummary - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 36: Function inspect - callable behavior in this runtime organ.
  function inspect() {
    const summary = safeSummary();
    log("CRAWLER: index summary follows.", "log-blue");
    log(`CRAWLER: entries=${summary.entryCount}, indexed=${summary.lastIndexedAt || "never"}, searches=${summary.searchCount}`);
    consoleReport("AIDA_CRAWLER_INSPECT", summary);
    return summary;
  }

// AIDA REVIEW BLOCK 37: Function install - callable behavior in this runtime organ.
  function install() {
    ensureState();
    const loaded = loadPersisted();
    log(`Crawler organ loaded. Search is on demand. ${loaded.ok ? `Loaded ${loaded.entryCount} indexed item(s).` : "No persisted index loaded."}`, "log-blue");
  }

// AIDA REVIEW BLOCK 38: Browser export AIDA_CRAWLER - exposes this organ to the page runtime.
  window.AIDA_CRAWLER = {
    indexNow,
    search,
    remember,
    entriesForCurrentLlm,
    freshGlance,
    inspect,
    safeSummary,
    loadPersisted
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "memory_retrieval",
      reads: ["AIDA_RUNTIME.session", "AIDA_RUNTIME.drive.files", "AIDA_RUNTIME.librarian", "AIDA_RUNTIME.curator"],
      writes: ["AIDA_RUNTIME.crawler.entries", "localStorage.AIDA_CRAWLER_INDEX_V1"],
      requires: ["AIDA_RUNTIME"],
      verifies: ["human-readable memory remains source of truth while compact searchable sidecar indexes are built broadly and retrieval is filtered to the active LLM plus shared core memory"]
    });
  }

// AIDA REVIEW BLOCK 39: Browser event wiring - connects page lifecycle or user actions to this organ.
  document.addEventListener("DOMContentLoaded", install);
})();
