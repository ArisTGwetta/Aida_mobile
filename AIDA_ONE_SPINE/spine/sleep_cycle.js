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
          "while-away seed queue"
        ]
      }
    };

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
    return summary;
  }

  function sleepNow(reason = "manual_sleep") {
    const packet = buildPacket(reason);
    if (typeof window.aida_depart === "function") window.aida_depart();
    return packet;
  }

  function install() {
    log("Sleep cycle organ loaded. Drive sync is draft-only.", "log-blue");
  }

  window.AIDA_SLEEP = {
    buildPacket,
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
        "AIDA_RUNTIME.sleep.whileAway"
      ],
      writes: [
        "AIDA_RUNTIME.sleep.lastActive",
        "AIDA_RUNTIME.sleep.lastPacket",
        "AIDA_RUNTIME.sleep.packets",
        "AIDA_RUNTIME.drive.syncQueue"
      ],
      requires: ["AIDA_RUNTIME", "AIDA_SESSION_CAPTURE", "AIDA_CONTEXT_EVOLUTION", "AIDA_WHILE_AWAY"],
      verifies: ["manual sleep collects session, context, emotion, face wishlist, and while-away drafts without Drive writes"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
