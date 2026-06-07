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
    const candidates = [];
    const patterns = [
      { re: /\b(?:i|we)\s+(?:need|want|prefer|like|love|use|work on|am working on|care about)\s+([^.!?]{4,160})/i, scope: "user", confidence: 0.68 },
      { re: /\b(?:i|we)\s+(?:do not|don't|cannot|can't|won't)\s+([^.!?]{4,160})/i, scope: "user", confidence: 0.62 },
      { re: /\b(?:this|the)\s+(?:project|system|app|memory|architecture)\s+(?:needs|uses|has|should)\s+([^.!?]{4,160})/i, scope: "project", confidence: 0.6 }
    ];

    (turns || []).forEach((turn) => {
      const text = cleanText(turn.user?.text, 500);
      patterns.forEach((pattern) => {
        const match = text.match(pattern.re);
        if (!match) return;
        const claim = cleanText(match[0], 220);
        if (!claim || candidates.some((item) => item.claim === claim)) return;
        const project = turn.tags?.project || "unknown_project";
        candidates.push({
          id: `fact_candidate_${slug(project)}_${turn.turnIndex}_${candidates.length + 1}`,
          scope: pattern.scope === "project" ? `project:${project}` : pattern.scope,
          claim,
          confidence: pattern.confidence,
          source_refs: [sourceRef(turn.tags?.session_id, turn.turnIndex)],
          status: "candidate",
          last_seen: turn.capturedAt || createdAt
        });
      });
    });

    return candidates.slice(0, 8);
  }

  function buildInsightCandidates(facts, turns, createdAt) {
    const project = dominantValue(turns, (turn) => turn.tags?.project, "unknown_project");
    return (facts || []).slice(0, 5).map((fact, index) => ({
      id: `insight_candidate_${slug(project)}_${index + 1}`,
      scope: fact.scope?.startsWith("project:") ? fact.scope : `project:${project}`,
      derived_from: [fact.id],
      guidance: `When working in ${project}, keep this candidate memory in view: ${fact.claim}`,
      confidence: Math.max(0.45, Math.min(0.72, (fact.confidence || 0.55) - 0.05)),
      status: "candidate",
      last_evaluated: createdAt
    }));
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
    const summary = summarizeTurns(turns, { project, role });
    const facts = extractFactCandidates(turns, createdAt);

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
        createdAt
      },
      fact_candidates: facts,
      insight_candidates: buildInsightCandidates(facts, turns, createdAt),
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

  function validateLlmDistillation(candidate) {
    if (!candidate || typeof candidate !== "object") {
      throw new Error("LLM distillation JSON was not an object.");
    }

    return {
      diaryDrafts: safeArray(candidate.diaryDrafts),
      rollingSummaries: safeArray(candidate.rollingSummaries),
      longSummaryCandidates: safeArray(candidate.longSummaryCandidates),
      factCandidates: safeArray(candidate.factCandidates),
      insightCandidates: safeArray(candidate.insightCandidates),
      projectLedgerUpdates: safeArray(candidate.projectLedgerUpdates),
      openThreads: safeArray(candidate.openThreads)
    };
  }

  function buildLlmDistillationMessages(packet) {
    const compactPacket = {
      id: packet.id,
      reason: packet.reason,
      capturedAt: packet.capturedAt,
      session: packet.session,
      contextEvolution: {
        summaryDrafts: packet.contextEvolution?.summaryDrafts || [],
        projectLedgerDrafts: packet.contextEvolution?.projectLedgerDrafts || []
      },
      emotion: packet.emotion,
      whileAway: packet.whileAway,
      fallbackDistillation: packet.distillation
    };

    const system = [
      "You are Aida's sleep memory distiller.",
      "Turn a sleep packet into structured memory drafts only.",
      "Return strict JSON and no prose.",
      "Do not invent facts outside the packet.",
      "Keep facts and insights as candidate or needs_confirmation unless the user explicitly stated a low-risk stable preference or project requirement.",
      "Preserve source_refs/source_turns wherever possible.",
      "Use this exact top-level shape:",
      "{",
      '  "diaryDrafts": [],',
      '  "rollingSummaries": [],',
      '  "longSummaryCandidates": [],',
      '  "factCandidates": [],',
      '  "insightCandidates": [],',
      '  "projectLedgerUpdates": [],',
      '  "openThreads": []',
      "}",
      "Diary preserves felt shape. Rolling summary preserves immediate continuity. Long summary candidates preserve durable project arc. Facts are stable claims. Insights are behavior guidance derived from facts/themes."
    ].join("\n");

    return [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(compactPacket, null, 2) }
    ];
  }

  function collectSession(session) {
    const turns = session?.currentTurns || [];
    return {
      id: session?.id || null,
      startedAt: session?.startedAt || null,
      lastTurnAt: session?.lastTurnAt || null,
      exchangeCount: session?.exchangeCount || turns.length,
      unsaved: Boolean(session?.unsaved),
      exchanges: turns.map(exchangeSummary),
      latestExchanges: latest(turns, 6).map((exchange) => ({
        ...exchangeSummary(exchange),
        userPreview: String(exchange.user?.text || "").replace(/\s+/g, " ").trim().slice(0, 220),
        aidaPreview: String(exchange.aida?.text || "").replace(/\s+/g, " ").trim().slice(0, 220)
      }))
    };
  }

  function collectEvolution(evolution) {
    return {
      queuedChunks: copyJson(evolution?.queuedChunks || [], []),
      summaryDrafts: copyJson(evolution?.summaryDrafts || [], []),
      projectLedgerDrafts: copyJson(evolution?.projectLedgerDrafts || [], []),
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
      emotional_notes: outputs.diary_candidate?.emotional_shape ? [outputs.diary_candidate.emotional_shape] : [],
      while_away_seed: copyJson(whileAwaySeed || null, null),
      last_active: createdAt
    };
  }

  function distillPacket(packet, rt) {
    const turns = rt.session?.currentTurns || [];
    const createdAt = packet.capturedAt || nowIso();
    const state = rt.contextEvolution || {};
    const diaryDrafts = [];
    const rollingSummaries = [];
    const longSummaryCandidates = [];
    const factCandidates = [];
    const insightCandidates = [];
    const openThreads = [];
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
      openThreads.push(...outputs.open_threads);

      const ledgerDraft = (state.projectLedgerDrafts || []).find((item) => item.sourceSummaryDraftId === draft.id);
      if (ledgerDraft) {
        fillProjectLedgerDraft(ledgerDraft, outputs, packet.whileAway?.seed, createdAt);
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
      projectLedgerUpdates: copyJson(state.projectLedgerDrafts || [], []),
      openThreads,
      counts: {
        summaryDraftsFilled: filledSummaryDrafts,
        ledgerDraftsFilled: filledLedgerDrafts,
        diaryDrafts: diaryDrafts.length,
        factCandidates: factCandidates.length,
        insightCandidates: insightCandidates.length
      }
    };

    packet.contextEvolution = collectEvolution(state);
    packet.projectLedgerDrafts = copyJson(state.projectLedgerDrafts || [], []);
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
    const counts = {
      summaryDraftsFilled: fallback.counts?.summaryDraftsFilled || 0,
      ledgerDraftsFilled: fallback.counts?.ledgerDraftsFilled || 0,
      diaryDrafts: llmDraft.diaryDrafts.length,
      factCandidates: llmDraft.factCandidates.length,
      insightCandidates: llmDraft.insightCandidates.length
    };

    packet.distillation = {
      ...fallback,
      status: "llm_draft_filled",
      method: "llm_refined_draft",
      fallback,
      llmFilledAt: createdAt,
      diaryDrafts: llmDraft.diaryDrafts,
      rollingSummaries: llmDraft.rollingSummaries,
      longSummaryCandidates: llmDraft.longSummaryCandidates,
      factCandidates: llmDraft.factCandidates,
      insightCandidates: llmDraft.insightCandidates,
      projectLedgerUpdates: llmDraft.projectLedgerUpdates.length ? llmDraft.projectLedgerUpdates : fallback.projectLedgerUpdates || [],
      openThreads: llmDraft.openThreads,
      counts
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
      packet.contextEvolution = collectEvolution(rt.contextEvolution);
    }

    return packet.distillation;
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
      return packet.distillation;
    }

    const startedAt = nowIso();
    packet.distillation.llm = {
      status: "running",
      startedAt
    };
    log(`SLEEP LLM: refining distillation for ${packet.id}.`, "log-blue");

    try {
      const maxOutputTokens = window.AIDA_CONFIG?.llm?.sleepMaxOutputTokens || 1800;
      const responseText = await window.AIDA_OPENAI.callMessages(buildLlmDistillationMessages(packet), {
        maxOutputTokens
      });
      const llmDraft = validateLlmDistillation(extractJsonObject(responseText));
      const distillation = applyLlmDistillation(packet, llmDraft, nowIso());
      distillation.llm = {
        status: "complete",
        startedAt,
        finishedAt: distillation.llmFilledAt,
        maxOutputTokens
      };
      rt.sleep.lastPacket = packet;
      log(`SLEEP LLM: complete. diary=${distillation.counts.diaryDrafts}, facts=${distillation.counts.factCandidates}, insights=${distillation.counts.insightCandidates}.`, "log-blue");
      return distillation;
    } catch (error) {
      packet.distillation.llm = {
        status: "failed",
        startedAt,
        failedAt: nowIso(),
        error: error.message
      };
      log(`SLEEP LLM: failed; fallback distillation remains active. ${error.message}`, "log-amber");
      return packet.distillation;
    }
  }

  function buildPacket(reason = "manual_sleep") {
    const rt = runtime();
    if (!rt) return null;

    const capturedAt = nowIso();
    const packet = {
      id: `sleep_${capturedAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`,
      status: "ready_for_drive_sync",
      reason,
      capturedAt,
      session: collectSession(rt.session),
      pendingJournal: copyJson(rt.sleep?.pendingJournal || [], []),
      contextEvolution: collectEvolution(rt.contextEvolution),
      projectLedgerDrafts: copyJson(rt.contextEvolution?.projectLedgerDrafts || [], []),
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
      diaryDraftCount: packet.distillation?.counts?.diaryDrafts || 0,
      factCandidateCount: packet.distillation?.counts?.factCandidates || 0,
      insightCandidateCount: packet.distillation?.counts?.insightCandidates || 0,
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
    log(`SLEEP DISTILLATION: diary=${summary.diaryDraftCount}, facts=${summary.factCandidateCount}, insights=${summary.insightCandidateCount}`);
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
    refinePacketWithLlm(packet);
    if (typeof window.aida_depart === "function") window.aida_depart();
    return packet;
  }

  function install() {
    log("Sleep cycle organ loaded. Drive sync is draft-only.", "log-blue");
  }

  window.AIDA_SLEEP = {
    buildPacket,
    refinePacketWithLlm,
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
        "AIDA_RUNTIME.drive.syncQueue"
      ],
      requires: ["AIDA_RUNTIME", "AIDA_SESSION_CAPTURE", "AIDA_CONTEXT_EVOLUTION", "AIDA_WHILE_AWAY"],
      verifies: ["manual sleep collects fallback distillation drafts immediately, then optionally refines them through OpenAI without Drive writes"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
