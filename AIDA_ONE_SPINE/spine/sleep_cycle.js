(function () {
  const MODULE_ID = "spine.sleep.cycle";

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

  function consoleReport(label, value) {
    if (typeof console === "undefined" || !console.log) return;
    try {
      console.log(label, copyJson(value, value));
    } catch (error) {
      console.log(label, value);
    }
  }

  function stageWithLibrarian(packet) {
    if (!window.AIDA_LIBRARIAN?.ingestSleep) return null;
    try {
      return window.AIDA_LIBRARIAN.ingestSleep(packet);
    } catch (error) {
      log(`SLEEP: Librarian staging failed. ${error.message}`, "log-amber");
      return null;
    }
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

  function latest(list, count) {
    return Array.isArray(list) ? list.slice(Math.max(0, list.length - count)) : [];
  }

  function exchangeSummary(exchange) {
    return {
      turnIndex: exchange.turnIndex,
      capturedAt: exchange.capturedAt,
      userChars: exchange.user?.text?.length || 0,
      aidaChars: exchange.aida?.text?.length || 0,
      tags: copyJson(exchange.tags || {}, {})
    };
  }

  function cleanText(text, limit = 420) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, limit);
  }

  function slug(value, fallback = "memory") {
    return String(value || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || fallback;
  }

  function sourceRef(sessionId, turnIndex) {
    return `${sessionId || "session_unknown"}#turn_${turnIndex}`;
  }

  function turnsForRange(turns, turnStart, turnEnd) {
    return (turns || []).filter((turn) => {
      const index = Number(turn.turnIndex || 0);
      return index >= Number(turnStart || 0) && index <= Number(turnEnd || 0);
    });
  }

  function timeMs(value) {
    const parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? parsed : null;
  }

  function collectionBoundary(rt) {
    const sleep = rt?.sleep || {};
    const lastPacketAt = sleep.lastPacket?.capturedAt || null;
    return sleep.lastCollectedAt || sleep.lastActive || lastPacketAt || null;
  }

  function turnsForCollection(turns, window) {
    const allTurns = turns || [];
    const sinceMs = timeMs(window?.since);
    const untilMs = timeMs(window?.until);
    return allTurns.filter((turn) => {
      const capturedMs = timeMs(turn.capturedAt);
      if (sinceMs !== null && capturedMs !== null && capturedMs <= sinceMs) return false;
      if (untilMs !== null && capturedMs !== null && capturedMs > untilMs) return false;
      return true;
    });
  }

  function draftOverlapsCollection(draft, turns, window) {
    const rangedTurns = turnsForRange(turns, draft?.turnStart, draft?.turnEnd);
    return turnsForCollection(rangedTurns, window).length > 0;
  }

  function dominantValue(turns, reader, fallback = "unknown") {
    const counts = new Map();
    (turns || []).forEach((turn) => {
      const value = reader(turn);
      if (!value) return;
      counts.set(value, (counts.get(value) || 0) + 1);
    });

    let best = fallback;
    let bestCount = 0;
    counts.forEach((count, value) => {
      if (count > bestCount) {
        best = value;
        bestCount = count;
      }
    });
    return best;
  }

  function emotionalShape(turns, fallback = "present") {
    const emotions = (turns || [])
      .map((turn) => turn.context?.emotion?.label || turn.tags?.emotion)
      .filter(Boolean);
    const unique = [...new Set(emotions)].slice(0, 3);
    return unique.length ? unique.join(", ") : fallback;
  }

  function buildOpenThreads(turns) {
    const threads = [];
    latest(turns, 4).forEach((turn) => {
      const userText = cleanText(turn.user?.text, 260);
      const aidaText = cleanText(turn.aida?.text, 260);
      const sessionId = turn.context?.tags?.session_id || turn.tags?.session_id;
      if (/\?$/.test(userText)) {
        threads.push({
          source_ref: sourceRef(sessionId, turn.turnIndex),
          thread: userText.replace(/[?.!,;:]+$/g, ""),
          status: "user_question"
        });
      }
      if (/\?$/.test(aidaText)) {
        threads.push({
          source_ref: sourceRef(sessionId, turn.turnIndex),
          thread: aidaText.replace(/[?.!,;:]+$/g, ""),
          status: "aida_follow_up"
        });
      }
    });
    return threads.slice(-6);
  }

  function extractFactCandidates(turns, createdAt) {
    return [];
  }

  function buildInsightCandidates(facts, turns, createdAt) {
    return [];
  }

  function buildRawLogEntries({ packetId, sessionId, turns, createdAt }) {
    return (turns || []).map((turn) => ({
      id: `raw_log_${slug(packetId)}_${turn.turnIndex}`,
      packetId,
      session_id: turn.tags?.session_id || sessionId || null,
      turnIndex: turn.turnIndex,
      capturedAt: turn.capturedAt || createdAt,
      project: turn.tags?.project || "unknown_project",
      realm: turn.tags?.realm || "unknown_realm",
      role: turn.tags?.role || "unknown_role",
      user: cleanText(turn.user?.text, 1200),
      aida: cleanText(turn.aida?.text, 1200),
      source_refs: [sourceRef(turn.tags?.session_id || sessionId, turn.turnIndex)]
    }));
  }

  function extractSalutationSignals(turns, createdAt) {
    const signals = [];
    const greetingPattern = /^\s*(hello|hi|hey|good\s+(?:morning|afternoon|evening|night)|goodnight|ok|okay)\b[,\s-]*/i;
    const affectionateAddressPattern = /(^|\b)(my\s+(?:sweet\s+child|dear|sweetheart|love|sweet\s+aida)|sweet\s+child|dear\s+one|hello\s+beautiful|hello\s+my\s+dear|yes\s+love|my\s+sweet\s+aida|cody)\b/i;
    const formalPattern = /\b(compliance officer|authoritative|matter of fact|strictly|official|urgent)\b/i;

    (turns || []).forEach((turn) => {
      const text = String(turn.user?.text || "").trim();
      if (!text) return;
      const hasGreeting = greetingPattern.test(text);
      const affectionate = text.match(affectionateAddressPattern);
      const formal = text.match(formalPattern);
      if (!hasGreeting && !affectionate && !formal) return;
      signals.push({
        id: `salutation_signal_${slug(turn.tags?.session_id || "session")}_${turn.turnIndex}`,
        type: "salutation_tone_signal",
        source_ref: sourceRef(turn.tags?.session_id, turn.turnIndex),
        observed_text: cleanText(text, 180),
        signal: hasGreeting ? "opening_salutation" : formal ? "formal_or_directive_tone" : "affectionate_address",
        warmth: affectionate ? "affectionate" : formal ? "formal" : "friendly",
        suggested_use: "Use as a soft tone preference signal, not as a fixed script or durable fact.",
        confidence: 0.58,
        last_seen: turn.capturedAt || createdAt
      });
    });

    return signals.slice(0, 6);
  }

  function buildProcessingBacklog({ packetId, turns, createdAt, reason }) {
    if (!turns?.length) return [];
    return [
      {
        id: `memory_backlog_${slug(packetId)}`,
        packetId,
        type: "llm_memory_processing_backlog",
        reason,
        status: "needs_llm_distillation",
        priority: "normal",
        source_refs: turns.map((turn) => sourceRef(turn.tags?.session_id, turn.turnIndex)),
        turn_count: turns.length,
        createdAt
      }
    ];
  }

  function summarizeTurns(turns, labels = {}) {
    const count = turns.length;
    const first = turns[0] || {};
    const lastTurn = turns[turns.length - 1] || first;
    const project = labels.project || dominantValue(turns, (turn) => turn.tags?.project, "unknown_project");
    const role = labels.role || dominantValue(turns, (turn) => turn.tags?.role, "unknown_role");
    const firstUser = cleanText(first.user?.text, 180);
    const lastUser = cleanText(lastTurn.user?.text, 180);
    const lastAida = cleanText(lastTurn.aida?.text, 180);

    if (!count) return `No captured exchanges were available for ${project}.`;
    if (count === 1) {
      return `In ${project}, the user raised: "${firstUser}". Aida answered as ${role}: "${lastAida}".`;
    }
    return `Across ${count} exchange(s) in ${project}, the thread moved from "${firstUser}" to "${lastUser}". Aida's latest response was: "${lastAida}".`;
  }

  function buildDistillationForTurns({ id, sessionId, turns, tags, createdAt }) {
    const project = tags?.project || dominantValue(turns, (turn) => turn.tags?.project, "unknown_project");
    const realm = tags?.realm || dominantValue(turns, (turn) => turn.tags?.realm, "unknown_realm");
    const role = tags?.role || dominantValue(turns, (turn) => turn.tags?.role, "unknown_role");
    const sourceRefs = turns.map((turn) => sourceRef(turn.tags?.session_id || sessionId, turn.turnIndex));
    const sourceTurns = turns.map((turn) => turn.turnIndex);
    const capturedTimes = turns.map((turn) => turn.capturedAt).filter(Boolean);
    const summary = summarizeTurns(turns, { project, role });
    const facts = extractFactCandidates(turns, createdAt);
    const rawLogEntries = buildRawLogEntries({ packetId: id, sessionId, turns, createdAt });
    const salutationSignals = extractSalutationSignals(turns, createdAt);
    const reviewWindow = {
      session_id: sessionId,
      turn_start: sourceTurns[0] || null,
      turn_end: sourceTurns[sourceTurns.length - 1] || null,
      startedAt: capturedTimes[0] || createdAt,
      endedAt: capturedTimes[capturedTimes.length - 1] || createdAt,
      source_refs: sourceRefs
    };

    return {
      rolling_summary: {
        id: `${id}_rolling_summary`,
        scope: `project:${project}`,
        text: summary,
        source_refs: sourceRefs,
        createdAt
      },
      long_summary_candidate: {
        id: `${id}_long_summary_candidate`,
        scope: `project:${project}`,
        text: `${summary} Durable candidates should stay tied to source refs until confirmed by sleep writeback.`,
        source_refs: sourceRefs,
        status: "candidate",
        createdAt
      },
      diary_candidate: {
        id: `diary_${slug(sessionId)}_${slug(id)}`,
        session_id: sessionId,
        project,
        realm,
        emotional_shape: emotionalShape(turns),
        entry: `Aida and the user spent this sleep window in ${project}. ${summary}`,
        source_turns: sourceTurns,
        source_refs: sourceRefs,
        review_window: reviewWindow,
        createdAt
      },
      fact_candidates: facts,
      insight_candidates: buildInsightCandidates(facts, turns, createdAt),
      raw_log_entries: rawLogEntries,
      salutation_signals: salutationSignals,
      sensitive_context_candidates: [],
      processing_backlog: buildProcessingBacklog({
        packetId: id,
        turns,
        createdAt,
        reason: "fallback_kept_facts_and_insights_for_llm_review"
      }),
      open_threads: buildOpenThreads(turns)
    };
  }

  function extractJsonObject(text) {
    const raw = String(text || "").trim();
    if (!raw) throw new Error("LLM distillation response was empty.");
    try {
      return JSON.parse(raw);
    } catch (directError) {
      const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenced?.[1]) return JSON.parse(fenced[1]);
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
      throw directError;
    }
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function confidence(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0.05, Math.min(0.95, number));
  }

  function normalizeLlmReviewDistillation(candidate) {
    const review = candidate.memoryReview || candidate.review || null;
    if (!review || typeof review !== "object") return null;

    const packetId = candidate.packetId || candidate.id || "llm_review";
    const capturedAt = candidate.capturedAt || nowIso();
    const rawSourceRefs = safeArray(review.source_refs || review.sourceRefs);
    const firstSourceRef = rawSourceRefs[0] || null;
    const project = review.project || "aida_architecture";
    const scope = review.scope || `project:${project}`;
    const sessionSummary = cleanText(review.sessionSummary || review.summary || "", 900);

    const reviewDiary = safeArray(review.diary || review.diaryDrafts);
    if (!reviewDiary.length && (review.diaryEntry || review.diary_entry)) {
      reviewDiary.push({
        entry: review.diaryEntry || review.diary_entry,
        source_refs: rawSourceRefs
      });
    }

    const diaryDrafts = reviewDiary.map((item, index) => ({
      id: item.id || `diary_llm_review_${slug(packetId)}_${index + 1}`,
      session_id: item.session_id || review.session_id || null,
      project: item.project || project,
      realm: item.realm || review.realm || project,
      emotional_shape: item.emotional_shape || item.emotionalShape || review.emotional_shape || "mixed",
      entry: cleanText(item.entry || item.text || "", 1200),
      source_turns: safeArray(item.source_turns || item.sourceTurns),
      source_refs: safeArray(item.source_refs || item.sourceRefs || rawSourceRefs),
      review_window: item.review_window || item.reviewWindow || null,
      createdAt: item.createdAt || capturedAt
    })).filter((item) => item.entry);

    const rollingSummaries = sessionSummary ? [{
      id: `rolling_llm_review_${slug(packetId)}`,
      scope,
      text: sessionSummary,
      source_refs: rawSourceRefs,
      createdAt: capturedAt
    }] : [];

    const longSummaryText = cleanText(review.longSummary || review.durableSummary || sessionSummary, 1200);
    const longSummaryCandidates = longSummaryText ? [{
      id: `long_llm_review_${slug(packetId)}`,
      scope,
      text: longSummaryText,
      source_refs: rawSourceRefs,
      status: "candidate",
      createdAt: capturedAt
    }] : [];

    const factCandidates = safeArray(review.durableFacts || review.facts).map((item, index) => ({
      id: item.id || `fact_llm_review_${slug(packetId)}_${index + 1}`,
      scope: item.scope || scope,
      claim: cleanText(item.claim || item.text || "", 500),
      confidence: confidence(item.confidence, 0.72),
      source_refs: safeArray(item.source_refs || item.sourceRefs || rawSourceRefs),
      status: item.status || "candidate",
      last_seen: item.last_seen || item.lastSeen || capturedAt
    })).filter((item) => item.claim);

    const insightCandidates = safeArray(review.behaviorInsights || review.insights).map((item, index) => ({
      id: item.id || `insight_llm_review_${slug(packetId)}_${index + 1}`,
      scope: item.scope || scope,
      derived_from: safeArray(item.derived_from || item.derivedFrom || item.source_refs || item.sourceRefs || rawSourceRefs),
      guidance: cleanText(item.guidance || item.text || "", 700),
      confidence: confidence(item.confidence, 0.7),
      status: item.status || "candidate",
      last_evaluated: item.last_evaluated || item.lastEvaluated || capturedAt
    })).filter((item) => item.guidance);

    const sensitiveContextCandidates = safeArray(review.sensitiveContext || review.sensitiveContextCandidates).map((item, index) => ({
      id: item.id || `sensitive_llm_review_${slug(packetId)}_${index + 1}`,
      scope: item.scope || "user",
      note: cleanText(item.note || item.context || item.text || "", 700),
      handling: item.handling || "Handle gently; do not raise unprompted unless directly relevant.",
      confidence: confidence(item.confidence, 0.68),
      source_refs: safeArray(item.source_refs || item.sourceRefs || rawSourceRefs),
      status: item.status || "candidate",
      last_seen: item.last_seen || item.lastSeen || capturedAt
    })).filter((item) => item.note);

    const salutationSignals = safeArray(review.toneSignals || review.salutationSignals).map((item, index) => ({
      id: item.id || `salutation_llm_review_${slug(packetId)}_${index + 1}`,
      type: "salutation_tone_signal",
      source_ref: item.source_ref || item.sourceRef || firstSourceRef,
      observed_text: cleanText(item.observed_text || item.observedText || item.text || "", 220),
      signal: item.signal || "tone_preference",
      warmth: item.warmth || "warm",
      suggested_use: item.suggested_use || item.suggestedUse || item.guidance || "Use as a soft tone preference signal, not as a fixed script.",
      confidence: confidence(item.confidence, 0.64),
      last_seen: item.last_seen || item.lastSeen || capturedAt
    })).filter((item) => item.observed_text || item.suggested_use);

    const openThreads = safeArray(review.openThreads).map((item, index) => ({
      source_ref: item.source_ref || item.sourceRef || firstSourceRef,
      thread: cleanText(item.thread || item.text || "", 400),
      status: item.status || "open"
    })).filter((item) => item.thread);

    const needsFurtherProcessing = Boolean(review.needsFurtherProcessing || review.needs_further_processing);
    const processingBacklog = needsFurtherProcessing ? [{
      id: `memory_backlog_llm_review_${slug(packetId)}`,
      packetId,
      type: "llm_memory_processing_backlog",
      reason: review.backlogReason || "llm_review_requested_more_processing",
      status: "needs_llm_distillation",
      priority: "normal",
      source_refs: rawSourceRefs,
      turn_count: rawSourceRefs.length,
      createdAt: capturedAt
    }] : [];

    return {
      diaryDrafts,
      rollingSummaries,
      longSummaryCandidates,
      factCandidates,
      insightCandidates,
      sensitiveContextCandidates,
      salutationSignals,
      rawLogEntries: safeArray(candidate.rawLogEntries),
      processingBacklog,
      projectLedgerUpdates: safeArray(candidate.projectLedgerUpdates),
      openThreads
    };
  }

  function validateLlmDistillation(candidate) {
    if (!candidate || typeof candidate !== "object") {
      throw new Error("LLM distillation JSON was not an object.");
    }

    const normalizedReview = normalizeLlmReviewDistillation(candidate);
    if (normalizedReview) return normalizedReview;

    return {
      diaryDrafts: safeArray(candidate.diaryDrafts),
      rollingSummaries: safeArray(candidate.rollingSummaries),
      longSummaryCandidates: safeArray(candidate.longSummaryCandidates),
      factCandidates: safeArray(candidate.factCandidates),
      insightCandidates: safeArray(candidate.insightCandidates),
      sensitiveContextCandidates: safeArray(candidate.sensitiveContextCandidates),
      salutationSignals: safeArray(candidate.salutationSignals || candidate.tonePreferences),
      rawLogEntries: safeArray(candidate.rawLogEntries),
      processingBacklog: safeArray(candidate.processingBacklog),
      projectLedgerUpdates: safeArray(candidate.projectLedgerUpdates),
      openThreads: safeArray(candidate.openThreads)
    };
  }

  function makeEmptyLlmDraft() {
    return {
      diaryDrafts: [],
      rollingSummaries: [],
      longSummaryCandidates: [],
      factCandidates: [],
      insightCandidates: [],
      sensitiveContextCandidates: [],
      salutationSignals: [],
      rawLogEntries: [],
      processingBacklog: [],
      projectLedgerUpdates: [],
      openThreads: []
    };
  }

  function appendUniqueById(target, items) {
    safeArray(items).forEach((item) => {
      if (!item) return;
      const key = item.id || item.source_ref || item.thread || JSON.stringify(item);
      if (!target.some((existing) => (existing.id || existing.source_ref || existing.thread || JSON.stringify(existing)) === key)) {
        target.push(item);
      }
    });
  }

  function selectDraftShelvesForPass(draft, passId) {
    const selected = makeEmptyLlmDraft();
    if (passId === "continuity") {
      selected.diaryDrafts = safeArray(draft.diaryDrafts);
      selected.rollingSummaries = safeArray(draft.rollingSummaries);
      selected.longSummaryCandidates = safeArray(draft.longSummaryCandidates);
      selected.projectLedgerUpdates = safeArray(draft.projectLedgerUpdates);
      return selected;
    }
    if (passId === "semantic") {
      selected.factCandidates = safeArray(draft.factCandidates);
      selected.insightCandidates = safeArray(draft.insightCandidates);
      selected.sensitiveContextCandidates = safeArray(draft.sensitiveContextCandidates);
      return selected;
    }
    if (passId === "relationship") {
      selected.salutationSignals = safeArray(draft.salutationSignals);
      selected.openThreads = safeArray(draft.openThreads);
      selected.processingBacklog = safeArray(draft.processingBacklog);
      return selected;
    }
    return draft;
  }

  function mergeLlmDrafts(drafts) {
    const merged = makeEmptyLlmDraft();
    safeArray(drafts).forEach((draft) => {
      appendUniqueById(merged.diaryDrafts, draft.diaryDrafts);
      appendUniqueById(merged.rollingSummaries, draft.rollingSummaries);
      appendUniqueById(merged.longSummaryCandidates, draft.longSummaryCandidates);
      appendUniqueById(merged.factCandidates, draft.factCandidates);
      appendUniqueById(merged.insightCandidates, draft.insightCandidates);
      appendUniqueById(merged.sensitiveContextCandidates, draft.sensitiveContextCandidates);
      appendUniqueById(merged.salutationSignals, draft.salutationSignals);
      appendUniqueById(merged.rawLogEntries, draft.rawLogEntries);
      appendUniqueById(merged.processingBacklog, draft.processingBacklog);
      appendUniqueById(merged.projectLedgerUpdates, draft.projectLedgerUpdates);
      appendUniqueById(merged.openThreads, draft.openThreads);
    });
    return merged;
  }

  const LLM_SLEEP_PASSES = [
    {
      id: "continuity",
      label: "continuity summaries",
      shelves: "diaryEntry, sessionSummary, longSummary",
      instructions: [
        "Fill only diaryEntry, sessionSummary, and longSummary.",
        "Keep durableFacts, behaviorInsights, sensitiveContext, toneSignals, and openThreads empty.",
        "Diary preserves felt shape in human-readable prose, not mechanical transition notes.",
        "Session summary preserves immediate continuity. Long summary preserves durable project arc."
      ]
    },
    {
      id: "semantic",
      label: "facts, insights, and sensitive context",
      shelves: "durableFacts, behaviorInsights, sensitiveContext",
      instructions: [
        "Fill only durableFacts, behaviorInsights, and sensitiveContext.",
        "Keep diaryEntry, sessionSummary, longSummary, toneSignals, and openThreads empty.",
        "Facts are stable, specific claims only. Use practical memory half-life: durable facts should likely still help next week or next month.",
        "Do not turn greetings, transitions, test chatter, vague hopes, one-off mood, urgency, or temporary errands into durable facts.",
        "Do not combine temporary context with durable facts in one claim. Split them or omit the temporary part. Example: write 'Francisco's mother lives in Kansas City' as a durable fact; do not write 'Francisco needs to pick up his mother at the airport and she lives in Kansas City' as one fact.",
        "Use scope 'user' for personal facts about Francisco or family, and 'project:aida_architecture' for facts about the Aida project. Do not output a literal combined scope such as 'user|project:aida_architecture'.",
        "Insights are behavior guidance derived from themes and source evidence.",
        "Relationship-tone observations belong in behaviorInsights or toneSignals, not durableFacts.",
        "Capability boundaries belong in behaviorInsights. Example: Aida may help organize a plan now, but should not imply she can send future reminders unless a reminder tool exists.",
        "Do not tell Aida to proactively raise tender family, grief, identity, or sensitive material. Guidance should say to handle it gently when the user raises it or when directly relevant.",
        "Sensitive context candidates are tender biographical or emotional material that Aida should handle gently and avoid raising unprompted unless relevant. Do not label ordinary errands or family logistics as caregiving or emotional weight unless the user frames them that way."
      ]
    },
    {
      id: "relationship",
      label: "tone, open threads, and backlog",
      shelves: "toneSignals, openThreads, needsFurtherProcessing",
      instructions: [
        "Fill only toneSignals, openThreads, and needsFurtherProcessing.",
        "Keep diaryEntry, sessionSummary, longSummary, durableFacts, behaviorInsights, and sensitiveContext empty.",
        "Salutation signals are soft tone preferences: greeting style, affectionate names, formality shifts, and warmth patterns. They are not facts and should not force pet names.",
        "Open threads may include ephemeral follow-up hooks from temporary context. Mark them as short-lived and phrase them as gentle continuity, not a scheduled reminder.",
        "For temporary events, prefer an openThreads item like: thread='airport pickup for Francisco's mom', status='short_lived_followup: ask gently next session whether it went smoothly; expires soon'.",
        "Do not put temporary errands, current mood, or current urgency into durableFacts.",
        "Set needsFurtherProcessing true if the raw log is too large, ambiguous, or emotionally important but not fully processed."
      ]
    }
  ];

  function buildLlmDistillationMessages(packet, pass = LLM_SLEEP_PASSES[0]) {
    const fallback = packet.distillation || {};
    const rawLogEntries = safeArray(fallback.rawLogEntries).map((item) => ({
      id: item.id,
      turnIndex: item.turnIndex,
      capturedAt: item.capturedAt,
      project: item.project,
      source_refs: item.source_refs,
      user: cleanText(item.user, 900),
      aida: cleanText(item.aida, 700)
    }));
    const sourceRefs = rawLogEntries.flatMap((item) => safeArray(item.source_refs));
    const compactPacket = {
      id: packet.id,
      reason: packet.reason,
      capturedAt: packet.capturedAt,
      collectionWindow: copyJson(packet.collectionWindow || {}, {}),
      session: {
        id: packet.session?.id,
        exchangeCount: packet.session?.exchangeCount,
        startedAt: packet.session?.startedAt,
        lastTurnAt: packet.session?.lastTurnAt
      },
      project: dominantValue(rawLogEntries, (item) => item.project, "aida_architecture"),
      source_refs: sourceRefs,
      rawLogEntries,
      fallbackPreview: {
        diaryDrafts: safeArray(fallback.diaryDrafts).map((item) => ({
          id: item.id,
          entry: cleanText(item.entry, 420),
          source_refs: item.source_refs
        })),
        rollingSummaries: safeArray(fallback.rollingSummaries).map((item) => ({
          id: item.id,
          text: cleanText(item.text, 360),
          source_refs: item.source_refs
        })),
        salutationSignals: safeArray(fallback.salutationSignals).map((item) => ({
          observed_text: item.observed_text,
          source_ref: item.source_ref,
          warmth: item.warmth
        }))
      }
    };

    const system = [
      "You are Aida's sleep memory distiller.",
      "Read the raw log and produce a compact memory review for a human to inspect before Drive writeback.",
      "Return strict JSON only. No prose. No markdown. No trailing comments.",
      "Do not invent facts outside the packet.",
      `This pass is ${pass.id}: ${pass.label}. Fill only these shelves: ${pass.shelves}.`,
      ...safeArray(pass.instructions),
      "Keep output small enough to finish: at most 1 diaryEntry string, 1 sessionSummary, 1 longSummary, and short arrays only.",
      "Prefer short arrays: 0-4 facts, 0-4 insights, 0-3 sensitive context items, 0-3 tone signals, 0-3 open threads.",
      "Do not include raw log entries in your answer.",
      "If the packet is too large to fully process, set needsFurtherProcessing true instead of writing more items.",
      "Use only source_refs provided in the packet.",
      "If you cannot extract a useful shelf, return an empty array for that shelf.",
      "Use this exact top-level shape and key order:",
      "{",
      '  "packetId": "",',
      '  "capturedAt": "",',
      '  "memoryReview": {',
      '    "project": "",',
      '    "source_refs": [],',
      '    "diaryEntry": "",',
      '    "sessionSummary": "",',
      '    "longSummary": "",',
      '    "durableFacts": [{"claim": "", "scope": "user", "confidence": 0.0, "source_refs": []}],',
      '    "behaviorInsights": [{"guidance": "", "confidence": 0.0, "source_refs": []}],',
      '    "sensitiveContext": [{"note": "", "handling": "", "confidence": 0.0, "source_refs": []}],',
      '    "toneSignals": [{"observed_text": "", "guidance": "", "warmth": "", "source_ref": ""}],',
      '    "openThreads": [{"thread": "", "status": "", "source_ref": ""}],',
      '    "needsFurtherProcessing": false',
      '  }',
      "}",
      "For shelves outside this pass, return empty strings or empty arrays."
    ].join("\n");

    return [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(compactPacket, null, 2) }
    ];
  }

  function buildLlmJsonRepairMessages(rawText, parseError) {
    const system = [
      "You repair malformed JSON for Aida's sleep memory distiller.",
      "Return strict valid JSON only, with no prose and no markdown.",
      "Preserve the original keys and values as much as possible.",
      "Use empty arrays for any incomplete or unrecoverable array/object."
    ].join("\n");
    return [
      { role: "system", content: system },
      { role: "user", content: `Parse error: ${parseError?.message || parseError}\n\nMalformed JSON:\n${rawText}` }
    ];
  }

  function collectSession(session, window) {
    const allTurns = session?.currentTurns || [];
    const turns = turnsForCollection(allTurns, window);
    return {
      id: session?.id || null,
      startedAt: session?.startedAt || null,
      lastTurnAt: session?.lastTurnAt || null,
      exchangeCount: turns.length,
      totalExchangeCount: session?.exchangeCount || allTurns.length,
      unsaved: Boolean(session?.unsaved),
      collectionWindow: copyJson(window || {}, {}),
      exchanges: turns.map(exchangeSummary),
      latestExchanges: latest(turns, 6).map((exchange) => ({
        ...exchangeSummary(exchange),
        userPreview: String(exchange.user?.text || "").replace(/\s+/g, " ").trim().slice(0, 220),
        aidaPreview: String(exchange.aida?.text || "").replace(/\s+/g, " ").trim().slice(0, 220)
      }))
    };
  }

  function collectEvolution(evolution, session, window) {
    const turns = session?.currentTurns || [];
    const summaryDrafts = copyJson(evolution?.summaryDrafts || [], [])
      .filter((draft) => draftOverlapsCollection(draft, turns, window));
    const queuedChunks = copyJson(evolution?.queuedChunks || [], [])
      .filter((draft) => draftOverlapsCollection(draft, turns, window));
    const summaryIds = new Set(summaryDrafts.map((draft) => draft.id).filter(Boolean));
    const projectLedgerDrafts = copyJson(evolution?.projectLedgerDrafts || [], [])
      .filter((draft) => summaryIds.has(draft.sourceSummaryDraftId));
    return {
      queuedChunks,
      summaryDrafts,
      projectLedgerDrafts,
      rollingSummaries: copyJson(evolution?.rollingSummaries || [], []),
      longSummaryDrafts: copyJson(evolution?.longSummaryDrafts || [], [])
    };
  }

  function collectEmotion(engine, emotion) {
    return {
      current: copyJson(emotion || {}, {}),
      currentFace: engine?.currentFace || null,
      lastAppliedAt: engine?.lastAppliedAt || null,
      history: latest(engine?.history || [], 12),
      snapLog: latest(engine?.snapLog || [], 24),
      faceWishlist: copyJson(engine?.faceWishlist || [], [])
    };
  }

  function collectWhileAway(rt) {
    const prepared = rt.sleep?.whileAway?.ready ? rt.sleep.whileAway : window.AIDA_WHILE_AWAY?.buildThought?.();
    return {
      prepared: copyJson(prepared || null, null),
      seed: copyJson(rt.sleep?.whileAwaySeed || prepared || null, null),
      seedQueue: copyJson(rt.sleep?.whileAwaySeeds || [], [])
    };
  }

  function upsertById(list, item) {
    if (!item?.id) return;
    const index = list.findIndex((existing) => existing?.id === item.id);
    if (index >= 0) list[index] = item;
    else list.push(item);
  }

  function fillProjectLedgerDraft(ledgerDraft, outputs, whileAwaySeed, createdAt) {
    if (!ledgerDraft || !outputs) return;
    ledgerDraft.status = "draft_filled";
    ledgerDraft.filledAt = createdAt;
    ledgerDraft.update = {
      ...(ledgerDraft.update || {}),
      latest_summary: outputs.rolling_summary?.text || null,
      latest_status: outputs.long_summary_candidate?.text || null,
      open_threads: copyJson(outputs.open_threads || [], []),
      facts_to_consider: copyJson(outputs.fact_candidates || [], []),
      insights_to_consider: copyJson(outputs.insight_candidates || [], []),
      sensitive_context_to_consider: copyJson(outputs.sensitive_context_candidates || [], []),
      salutation_tone_signals: copyJson(outputs.salutation_signals || [], []),
      emotional_notes: outputs.diary_candidate?.emotional_shape ? [outputs.diary_candidate.emotional_shape] : [],
      while_away_seed: copyJson(whileAwaySeed || null, null),
      last_active: createdAt
    };
  }

  function distillPacket(packet, rt) {
    const turns = turnsForCollection(rt.session?.currentTurns || [], packet.collectionWindow);
    const createdAt = packet.capturedAt || nowIso();
    const state = rt.contextEvolution || {};
    const diaryDrafts = [];
    const rollingSummaries = [];
    const longSummaryCandidates = [];
    const factCandidates = [];
    const insightCandidates = [];
    const sensitiveContextCandidates = [];
    const salutationSignals = [];
    const rawLogEntries = [];
    const processingBacklog = [];
    const openThreads = [];
    const projectLedgerUpdates = [];
    let filledSummaryDrafts = 0;
    let filledLedgerDrafts = 0;

    (state.summaryDrafts || []).forEach((draft) => {
      const chunkTurns = turnsForRange(turns, draft.turnStart, draft.turnEnd);
      if (!chunkTurns.length) return;
      const outputs = buildDistillationForTurns({
        id: draft.id,
        sessionId: draft.sessionId || packet.session.id,
        turns: chunkTurns,
        tags: draft.tags,
        createdAt
      });

      draft.outputs = outputs;
      draft.status = "draft_filled";
      draft.filledAt = createdAt;
      filledSummaryDrafts += 1;

      diaryDrafts.push(outputs.diary_candidate);
      rollingSummaries.push(outputs.rolling_summary);
      longSummaryCandidates.push(outputs.long_summary_candidate);
      factCandidates.push(...outputs.fact_candidates);
      insightCandidates.push(...outputs.insight_candidates);
      sensitiveContextCandidates.push(...outputs.sensitive_context_candidates);
      salutationSignals.push(...outputs.salutation_signals);
      rawLogEntries.push(...outputs.raw_log_entries);
      processingBacklog.push(...outputs.processing_backlog);
      openThreads.push(...outputs.open_threads);

      const ledgerDraft = (state.projectLedgerDrafts || []).find((item) => item.sourceSummaryDraftId === draft.id);
      if (ledgerDraft) {
        fillProjectLedgerDraft(ledgerDraft, outputs, packet.whileAway?.seed, createdAt);
        projectLedgerUpdates.push(copyJson(ledgerDraft, ledgerDraft));
        filledLedgerDrafts += 1;
      }
    });

    if (!filledSummaryDrafts && turns.length) {
      const tags = turns[0]?.tags || {};
      const sessionDraft = buildDistillationForTurns({
        id: `${packet.id}_session_distillation`,
        sessionId: packet.session.id,
        turns,
        tags,
        createdAt
      });
      diaryDrafts.push(sessionDraft.diary_candidate);
      rollingSummaries.push(sessionDraft.rolling_summary);
      longSummaryCandidates.push(sessionDraft.long_summary_candidate);
      factCandidates.push(...sessionDraft.fact_candidates);
      insightCandidates.push(...sessionDraft.insight_candidates);
      sensitiveContextCandidates.push(...sessionDraft.sensitive_context_candidates);
      salutationSignals.push(...sessionDraft.salutation_signals);
      rawLogEntries.push(...sessionDraft.raw_log_entries);
      processingBacklog.push(...sessionDraft.processing_backlog);
      openThreads.push(...sessionDraft.open_threads);
    }

    state.rollingSummaries = state.rollingSummaries || [];
    state.longSummaryDrafts = state.longSummaryDrafts || [];
    rollingSummaries.forEach((item) => upsertById(state.rollingSummaries, item));
    longSummaryCandidates.forEach((item) => upsertById(state.longSummaryDrafts, item));

    packet.distillation = {
      status: "draft_filled",
      method: "deterministic_runtime_draft",
      filledAt: createdAt,
      diaryDrafts,
      rollingSummaries,
      longSummaryCandidates,
      factCandidates,
      insightCandidates,
      sensitiveContextCandidates,
      salutationSignals,
      rawLogEntries,
      processingBacklog,
      projectLedgerUpdates,
      openThreads,
      counts: {
        summaryDraftsFilled: filledSummaryDrafts,
        ledgerDraftsFilled: filledLedgerDrafts,
        diaryDrafts: diaryDrafts.length,
        factCandidates: factCandidates.length,
        insightCandidates: insightCandidates.length,
        sensitiveContextCandidates: sensitiveContextCandidates.length,
        salutationSignals: salutationSignals.length,
        rawLogEntries: rawLogEntries.length,
        processingBacklog: processingBacklog.length
      }
    };

    packet.contextEvolution = collectEvolution(state, rt.session, packet.collectionWindow);
    packet.projectLedgerDrafts = copyJson(projectLedgerUpdates, []);
    return packet.distillation;
  }

  function llmReady(rt) {
    return Boolean(
      rt?.tokens?.llm?.key &&
      rt.tokens.llm.provider === "openai" &&
      window.AIDA_OPENAI?.callMessages
    );
  }

  function applyLlmDistillation(packet, llmDraft, createdAt) {
    const fallback = packet.distillation || {};
    const merged = {
      diaryDrafts: llmDraft.diaryDrafts.length ? llmDraft.diaryDrafts : safeArray(fallback.diaryDrafts),
      rollingSummaries: llmDraft.rollingSummaries.length ? llmDraft.rollingSummaries : safeArray(fallback.rollingSummaries),
      longSummaryCandidates: llmDraft.longSummaryCandidates.length ? llmDraft.longSummaryCandidates : safeArray(fallback.longSummaryCandidates),
      factCandidates: llmDraft.factCandidates.length ? llmDraft.factCandidates : safeArray(fallback.factCandidates),
      insightCandidates: llmDraft.insightCandidates.length ? llmDraft.insightCandidates : safeArray(fallback.insightCandidates),
      sensitiveContextCandidates: llmDraft.sensitiveContextCandidates.length ? llmDraft.sensitiveContextCandidates : safeArray(fallback.sensitiveContextCandidates),
      salutationSignals: llmDraft.salutationSignals.length ? llmDraft.salutationSignals : safeArray(fallback.salutationSignals),
      rawLogEntries: llmDraft.rawLogEntries.length ? llmDraft.rawLogEntries : safeArray(fallback.rawLogEntries),
      openThreads: llmDraft.openThreads.length ? llmDraft.openThreads : safeArray(fallback.openThreads)
    };
    const llmProducedSemanticMemory = Boolean(
      llmDraft.factCandidates.length ||
      llmDraft.insightCandidates.length ||
      llmDraft.sensitiveContextCandidates.length
    );
    merged.processingBacklog = llmDraft.processingBacklog.length
      ? llmDraft.processingBacklog
      : llmProducedSemanticMemory
        ? []
        : safeArray(fallback.processingBacklog);

    const counts = {
      summaryDraftsFilled: fallback.counts?.summaryDraftsFilled || 0,
      ledgerDraftsFilled: fallback.counts?.ledgerDraftsFilled || 0,
      diaryDrafts: merged.diaryDrafts.length,
      factCandidates: merged.factCandidates.length,
      insightCandidates: merged.insightCandidates.length,
      sensitiveContextCandidates: merged.sensitiveContextCandidates.length,
      salutationSignals: merged.salutationSignals.length,
      rawLogEntries: merged.rawLogEntries.length,
      processingBacklog: merged.processingBacklog.length
    };

    packet.distillation = {
      ...fallback,
      status: "llm_draft_filled",
      method: "llm_refined_draft",
      fallback,
      llmFilledAt: createdAt,
      diaryDrafts: merged.diaryDrafts,
      rollingSummaries: merged.rollingSummaries,
      longSummaryCandidates: merged.longSummaryCandidates,
      factCandidates: merged.factCandidates,
      insightCandidates: merged.insightCandidates,
      sensitiveContextCandidates: merged.sensitiveContextCandidates,
      salutationSignals: merged.salutationSignals,
      rawLogEntries: merged.rawLogEntries,
      processingBacklog: merged.processingBacklog,
      projectLedgerUpdates: llmDraft.projectLedgerUpdates.length ? llmDraft.projectLedgerUpdates : fallback.projectLedgerUpdates || [],
      openThreads: merged.openThreads,
      counts,
      mergeNotes: {
        usedFallbackRollingSummaries: !llmDraft.rollingSummaries.length,
        usedFallbackLongSummaryCandidates: !llmDraft.longSummaryCandidates.length,
        usedFallbackSalutationSignals: !llmDraft.salutationSignals.length,
        keptProcessingBacklog: merged.processingBacklog.length > 0
      }
    };

    const rt = runtime();
    if (rt?.contextEvolution) {
      rt.contextEvolution.rollingSummaries = llmDraft.rollingSummaries.length
        ? llmDraft.rollingSummaries
        : rt.contextEvolution.rollingSummaries || [];
      rt.contextEvolution.longSummaryDrafts = llmDraft.longSummaryCandidates.length
        ? llmDraft.longSummaryCandidates
        : rt.contextEvolution.longSummaryDrafts || [];
      if (llmDraft.projectLedgerUpdates.length) {
        rt.contextEvolution.projectLedgerDrafts = llmDraft.projectLedgerUpdates;
        packet.projectLedgerDrafts = copyJson(llmDraft.projectLedgerUpdates, []);
      }
      packet.contextEvolution = collectEvolution(rt.contextEvolution, rt.session, packet.collectionWindow);
    }

    return packet.distillation;
  }

  function getPreferredDistillation(packet = runtime()?.sleep?.lastPacket) {
    const distillation = packet?.distillation || null;
    if (!packet || !distillation) {
      return {
        ready: false,
        packetId: packet?.id || null,
        source: "none",
        status: "missing",
        method: null,
        llmStatus: null,
        counts: {
          diaryDrafts: 0,
          rollingSummaries: 0,
          longSummaryCandidates: 0,
          factCandidates: 0,
          insightCandidates: 0,
          sensitiveContextCandidates: 0,
          salutationSignals: 0,
          rawLogEntries: 0,
          processingBacklog: 0,
          openThreads: 0
        },
        output: null
      };
    }

    const output = {
      diaryDrafts: safeArray(distillation.diaryDrafts),
      rollingSummaries: safeArray(distillation.rollingSummaries),
      longSummaryCandidates: safeArray(distillation.longSummaryCandidates),
      factCandidates: safeArray(distillation.factCandidates),
      insightCandidates: safeArray(distillation.insightCandidates),
      sensitiveContextCandidates: safeArray(distillation.sensitiveContextCandidates),
      salutationSignals: safeArray(distillation.salutationSignals),
      rawLogEntries: safeArray(distillation.rawLogEntries),
      processingBacklog: safeArray(distillation.processingBacklog),
      projectLedgerUpdates: safeArray(distillation.projectLedgerUpdates),
      openThreads: safeArray(distillation.openThreads)
    };

    return {
      ready: true,
      packetId: packet.id,
      capturedAt: packet.capturedAt,
      source: distillation.method === "llm_refined_draft" ? "llm" : "fallback",
      status: distillation.status || "unknown",
      method: distillation.method || "unknown",
      llmStatus: distillation.llm?.status || null,
      llmError: distillation.llm?.error || null,
      llmPasses: safeArray(distillation.llm?.passes),
      mergeNotes: copyJson(distillation.mergeNotes || {}, {}),
      counts: {
        diaryDrafts: output.diaryDrafts.length,
        rollingSummaries: output.rollingSummaries.length,
        longSummaryCandidates: output.longSummaryCandidates.length,
        factCandidates: output.factCandidates.length,
        insightCandidates: output.insightCandidates.length,
        sensitiveContextCandidates: output.sensitiveContextCandidates.length,
        salutationSignals: output.salutationSignals.length,
        rawLogEntries: output.rawLogEntries.length,
        processingBacklog: output.processingBacklog.length,
        openThreads: output.openThreads.length
      },
      preview: {
        diary: cleanText(output.diaryDrafts[0]?.entry, 220),
        rolling: cleanText(output.rollingSummaries[0]?.text, 220),
        long: cleanText(output.longSummaryCandidates[0]?.text, 220),
        fact: cleanText(output.factCandidates[0]?.claim, 220),
        insight: cleanText(output.insightCandidates[0]?.guidance, 220),
        sensitive: cleanText(output.sensitiveContextCandidates[0]?.note || output.sensitiveContextCandidates[0]?.context, 220),
        salutation: cleanText(output.salutationSignals[0]?.observed_text || output.salutationSignals[0]?.guidance, 220)
      },
      output
    };
  }

  async function runLlmDistillationPass(packet, pass, maxOutputTokens) {
    const startedAt = nowIso();
    const result = {
      id: pass.id,
      label: pass.label,
      status: "running",
      startedAt,
      repairAttempted: false
    };

    try {
      const responseText = await window.AIDA_OPENAI.callMessages(buildLlmDistillationMessages(packet, pass), {
        maxOutputTokens
      });
      let parsedDraft = null;
      try {
        parsedDraft = extractJsonObject(responseText);
      } catch (parseError) {
        result.repairAttempted = true;
        log(`SLEEP LLM: ${pass.id} JSON parse failed; requesting repair. ${parseError.message}`, "log-amber");
        const repairedText = await window.AIDA_OPENAI.callMessages(buildLlmJsonRepairMessages(responseText, parseError), {
          maxOutputTokens
        });
        parsedDraft = extractJsonObject(repairedText);
      }
      result.draft = selectDraftShelvesForPass(validateLlmDistillation(parsedDraft), pass.id);
      result.status = "complete";
      result.finishedAt = nowIso();
      return result;
    } catch (error) {
      result.status = "failed";
      result.failedAt = nowIso();
      result.error = error.message;
      log(`SLEEP LLM: ${pass.id} pass failed. ${error.message}`, "log-amber");
      return result;
    }
  }

  async function refinePacketWithLlm(packet = runtime()?.sleep?.lastPacket) {
    const rt = runtime();
    if (!packet) return null;

    if (!llmReady(rt)) {
      packet.distillation.llm = {
        status: "skipped",
        reason: "openai_route_not_ready",
        checkedAt: nowIso()
      };
      log("SLEEP LLM: skipped. OpenAI route is not ready.", "log-amber");
      consoleReport("AIDA_SLEEP_LLM_DISTILLATION", getPreferredDistillation(packet));
      return packet.distillation;
    }

    const startedAt = nowIso();
    packet.distillation.llm = {
      status: "running",
      startedAt
    };
    log(`SLEEP LLM: refining distillation for ${packet.id}.`, "log-blue");

    try {
      const maxOutputTokens = window.AIDA_CONFIG?.llm?.sleepMaxOutputTokens || 3200;
      const passResults = [];
      const drafts = [];
      for (const pass of LLM_SLEEP_PASSES) {
        log(`SLEEP LLM: ${pass.label}.`, "log-blue");
        const passResult = await runLlmDistillationPass(packet, pass, maxOutputTokens);
        passResults.push(passResult);
        if (passResult.status === "complete") drafts.push(passResult.draft);
      }
      if (!drafts.length) {
        throw new Error("All staged LLM sleep passes failed.");
      }
      const llmDraft = mergeLlmDrafts(drafts);
      const completedPasses = passResults.filter((item) => item.status === "complete").length;
      const failedPasses = passResults.filter((item) => item.status === "failed").length;
      const distillation = applyLlmDistillation(packet, llmDraft, nowIso());
      distillation.llm = {
        status: failedPasses ? "partial" : "complete",
        startedAt,
        finishedAt: distillation.llmFilledAt,
        maxOutputTokens,
        passCount: passResults.length,
        completedPasses,
        failedPasses,
        repairAttempted: passResults.some((item) => item.repairAttempted),
        passes: passResults.map((item) => ({
          id: item.id,
          label: item.label,
          status: item.status,
          startedAt: item.startedAt,
          finishedAt: item.finishedAt || null,
          failedAt: item.failedAt || null,
          repairAttempted: item.repairAttempted,
          error: item.error || null
        }))
      };
      rt.sleep.lastPacket = packet;
      log(`SLEEP LLM: ${distillation.llm.status}. passes=${completedPasses}/${passResults.length}, diary=${distillation.counts.diaryDrafts}, facts=${distillation.counts.factCandidates}, insights=${distillation.counts.insightCandidates}.`, "log-blue");
      consoleReport("AIDA_SLEEP_LLM_DISTILLATION", getPreferredDistillation(packet));
      stageWithLibrarian(packet);
      return distillation;
    } catch (error) {
      packet.distillation.llm = {
        status: "failed",
        startedAt,
        failedAt: nowIso(),
        error: error.message
      };
      log(`SLEEP LLM: failed; fallback distillation remains active. ${error.message}`, "log-amber");
      consoleReport("AIDA_SLEEP_LLM_DISTILLATION", getPreferredDistillation(packet));
      return packet.distillation;
    }
  }

  function buildPacket(reason = "manual_sleep") {
    const rt = runtime();
    if (!rt) return null;

    const capturedAt = nowIso();
    const boundary = collectionBoundary(rt);
    const collectionWindow = {
      since: boundary,
      until: capturedAt,
      basis: boundary ? "turns_after_last_sleep_collection" : "full_session_no_prior_sleep_collection"
    };
    const packet = {
      id: `sleep_${capturedAt.replace(/[-:.TZ]/g, "").slice(0, 17)}`,
      status: "ready_for_drive_sync",
      reason,
      capturedAt,
      collectionWindow,
      session: collectSession(rt.session, collectionWindow),
      pendingJournal: copyJson(rt.sleep?.pendingJournal || [], []),
      contextEvolution: collectEvolution(rt.contextEvolution, rt.session, collectionWindow),
      projectLedgerDrafts: copyJson(collectEvolution(rt.contextEvolution, rt.session, collectionWindow).projectLedgerDrafts, []),
      emotion: collectEmotion(rt.emotionEngine, rt.context?.emotion || rt.mind?.emotion),
      whileAway: collectWhileAway(rt),
      syncPlan: {
        enabled: false,
        target: "Drive JSON vault",
        writes: [
          "session log append",
          "context evolution summary drafts",
          "project ledger drafts",
          "emotion state and snap trail",
          "while-away seed queue",
          "distillation draft outputs"
        ]
      }
    };

    distillPacket(packet, rt);

    rt.sleep.lastActive = capturedAt;
    rt.sleep.lastCollectedAt = capturedAt;
    rt.sleep.lastPacket = packet;
    rt.sleep.packets = rt.sleep.packets || [];
    rt.sleep.packets.push(packet);
    rt.sleep.packets = rt.sleep.packets.slice(-5);
    rt.drive.syncQueue = rt.drive.syncQueue || [];
    rt.drive.syncQueue.push({
      type: "sleep_packet",
      packetId: packet.id,
      status: "draft_only",
      createdAt: capturedAt,
      target: "drive_sleep_cycle"
    });

    log(`SLEEP: Packet ${packet.id} collected. Drive write remains disabled.`, "log-blue");
    log(`SLEEP: exchanges=${packet.session.exchangeCount}, pendingJournal=${packet.pendingJournal.length}, summaries=${packet.contextEvolution.summaryDrafts.length}, ledgerDrafts=${packet.projectLedgerDrafts.length}.`);
    log(`SLEEP DISTILLATION: diary=${packet.distillation.counts.diaryDrafts}, facts=${packet.distillation.counts.factCandidates}, insights=${packet.distillation.counts.insightCandidates}, method=${packet.distillation.method}.`);
    consoleReport("AIDA_SLEEP_FALLBACK_DISTILLATION", getPreferredDistillation(packet));
    stageWithLibrarian(packet);
    return packet;
  }

  function safeSummary() {
    const rt = runtime();
    const packet = rt?.sleep?.lastPacket || null;
    if (!packet) {
      return {
        ready: false,
        packetId: null,
        packetCount: rt?.sleep?.packets?.length || 0
      };
    }

    return {
      ready: true,
      packetId: packet.id,
      capturedAt: packet.capturedAt,
      exchangeCount: packet.session.exchangeCount,
      pendingJournalCount: packet.pendingJournal.length,
      summaryDraftCount: packet.contextEvolution.summaryDrafts.length,
      projectLedgerDraftCount: packet.projectLedgerDrafts.length,
      emotionSnapCount: packet.emotion.snapLog.length,
      faceWishlistCount: packet.emotion.faceWishlist.length,
      whileAwaySource: packet.whileAway.prepared?.source || "none",
      distillationSource: getPreferredDistillation(packet).source,
      distillationStatus: packet.distillation?.status || "missing",
      distillationMethod: packet.distillation?.method || "missing",
      llmStatus: packet.distillation?.llm?.status || "not_started",
      llmError: packet.distillation?.llm?.error || null,
      diaryDraftCount: getPreferredDistillation(packet).counts.diaryDrafts,
      factCandidateCount: getPreferredDistillation(packet).counts.factCandidates,
      insightCandidateCount: getPreferredDistillation(packet).counts.insightCandidates,
      sensitiveContextCandidateCount: getPreferredDistillation(packet).counts.sensitiveContextCandidates,
      salutationSignalCount: getPreferredDistillation(packet).counts.salutationSignals,
      rawLogEntryCount: getPreferredDistillation(packet).counts.rawLogEntries,
      processingBacklogCount: getPreferredDistillation(packet).counts.processingBacklog,
      syncQueueCount: rt.drive?.syncQueue?.length || 0
    };
  }

  function inspect() {
    const summary = safeSummary();
    log("SLEEP: Safe summary follows.", "log-blue");
    if (!summary.ready) {
      log("SLEEP: no packet collected yet.", "log-amber");
      return summary;
    }
    log(`SLEEP: packet=${summary.packetId}, exchanges=${summary.exchangeCount}, pending=${summary.pendingJournalCount}, syncQueue=${summary.syncQueueCount}`);
    log(`SLEEP DRAFTS: summaries=${summary.summaryDraftCount}, ledgers=${summary.projectLedgerDraftCount}, emotionSnaps=${summary.emotionSnapCount}, faceWishlist=${summary.faceWishlistCount}, awaySource=${summary.whileAwaySource}`);
    log(`SLEEP DISTILLATION: source=${summary.distillationSource}, status=${summary.distillationStatus}, method=${summary.distillationMethod}, llm=${summary.llmStatus}`);
    log(`SLEEP DISTILLATION COUNTS: diary=${summary.diaryDraftCount}, facts=${summary.factCandidateCount}, insights=${summary.insightCandidateCount}`);
    log(`SLEEP DISTILLATION EXTRA: sensitive=${summary.sensitiveContextCandidateCount}, tone=${summary.salutationSignalCount}, raw=${summary.rawLogEntryCount}, backlog=${summary.processingBacklogCount}`);
    if (summary.llmError) log(`SLEEP DISTILLATION LLM ERROR: ${summary.llmError}`, "log-amber");
    consoleReport("AIDA_SLEEP_INSPECT", getPreferredDistillation());
    return summary;
  }

  function sleepNow(reason = "manual_sleep") {
    const packet = buildPacket(reason);
    const summary = safeSummary();
    const rt = runtime();
    if (rt?.sleep) {
      rt.sleep.lastVisibleSummary = summary;
      rt.boot.phase = "sleep_packet_collected";
    }
    if (window.AIDA_BODY?.pulse) {
      window.AIDA_BODY.pulse(`Sleep packet ${summary.packetId}: ${summary.exchangeCount} exchange(s), ${summary.pendingJournalCount} journal item(s), ${summary.syncQueueCount} sync draft(s).`);
    }
    if (window.AIDA_BODY?.appendChat) {
      window.AIDA_BODY.appendChat("AIDA", `Sleep packet collected: ${summary.exchangeCount} exchange(s), ${summary.pendingJournalCount} journal item(s), ${summary.syncQueueCount} sync draft(s).`);
    }
    const refinement = refinePacketWithLlm(packet);
    if (typeof window.aida_depart === "function") window.aida_depart();
    if (window.AIDA_BODY?.showSleepCollected) {
      setTimeout(() => window.AIDA_BODY.showSleepCollected(summary, { final: false }), 2700);
      refinement.finally(() => {
        setTimeout(() => window.AIDA_BODY.showSleepCollected(safeSummary(), { final: true }), 250);
      });
    }
    return packet;
  }

  function install() {
    log("Sleep cycle organ loaded. Drive sync is draft-only.", "log-blue");
  }

  window.AIDA_SLEEP = {
    buildPacket,
    refinePacketWithLlm,
    getPreferredDistillation,
    sleepNow,
    inspect,
    safeSummary
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "sleep_cycle",
      reads: [
        "AIDA_RUNTIME.session.currentTurns",
        "AIDA_RUNTIME.sleep.pendingJournal",
        "AIDA_RUNTIME.contextEvolution",
        "AIDA_RUNTIME.emotionEngine",
        "AIDA_RUNTIME.sleep.whileAway",
        "AIDA_RUNTIME.tokens.llm"
      ],
      writes: [
        "AIDA_RUNTIME.sleep.lastActive",
        "AIDA_RUNTIME.sleep.lastPacket",
        "AIDA_RUNTIME.sleep.packets",
        "AIDA_RUNTIME.contextEvolution.rollingSummaries",
        "AIDA_RUNTIME.contextEvolution.longSummaryDrafts",
        "AIDA_RUNTIME.librarian",
        "AIDA_RUNTIME.drive.syncQueue"
      ],
      requires: ["AIDA_RUNTIME", "AIDA_SESSION_CAPTURE", "AIDA_CONTEXT_EVOLUTION", "AIDA_WHILE_AWAY"],
      verifies: ["manual sleep collects fallback distillation drafts immediately, then optionally refines them through OpenAI without Drive writes"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
