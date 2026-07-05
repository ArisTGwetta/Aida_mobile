// AIDA_ONE_SPINE\spine\while_away.js
// AIDA REVIEW BLOCK 1: File header - while-away organ for re-entry continuity and "private life" seeds.
(function () {
  const MODULE_ID = "spine.while_away";

  // AIDA REVIEW BLOCK 2: Function runtime - access to shared AIDA runtime.
  function runtime() {
    return window.AIDA_RUNTIME;
  }

  // AIDA REVIEW BLOCK 3: Function log - lightweight logging to BIOS or BODY.
  function log(message, className = "log-blue") {
    if (window.AIDA_BIOS?.log) {
      window.AIDA_BIOS.log(message, className);
      return;
    }
    if (window.AIDA_BODY?.pulse) window.AIDA_BODY.pulse(message);
  }

  // AIDA REVIEW BLOCK 4: Function nowIso - current timestamp in ISO format.
  function nowIso() {
    return new Date().toISOString();
  }

  // AIDA REVIEW BLOCK 5: Function timeMs - parse ISO/string time into milliseconds.
  function timeMs(value) {
    const parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? parsed : null;
  }

  // AIDA REVIEW BLOCK 6: Function minutesBetween - difference in minutes between two timestamps.
  function minutesBetween(earlier, later) {
    const a = timeMs(earlier);
    const b = timeMs(later);
    if (a === null || b === null) return null;
    return Math.max(0, Math.round((b - a) / 60000));
  }

  // AIDA REVIEW BLOCK 7: Function cleanText - normalize text for seeds and previews.
  function cleanText(text, limit = 420) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, limit);
  }

  // AIDA REVIEW BLOCK 8: Function latest - get last N items from an array.
  function latest(list, count) {
    return Array.isArray(list) ? list.slice(Math.max(0, list.length - count)) : [];
  }

  // AIDA REVIEW BLOCK 9: Function safeArray - normalize to array.
  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  // AIDA REVIEW BLOCK 10: Function dominantValue - simple mode for project/realm/role.
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

  // AIDA REVIEW BLOCK 11: Function emotionalShape - compact emotional summary for seeds.
  function emotionalShape(turns, fallback = "present") {
    const emotions = (turns || [])
      .map((turn) => turn.context?.emotion?.label || turn.tags?.emotion)
      .filter(Boolean);
    const unique = [...new Set(emotions)].slice(0, 3);
    return unique.length ? unique.join(", ") : fallback;
  }

  // AIDA REVIEW BLOCK 12: Function recentExchanges - capture last few turns for context.
  function recentExchanges(rt, limit = 4) {
    const turns = rt?.session?.currentTurns || [];
    return latest(turns, limit).map((turn) => ({
      turnIndex: turn.turnIndex,
      capturedAt: turn.capturedAt,
      project: turn.tags?.project || null,
      realm: turn.tags?.realm || null,
      role: turn.tags?.role || null,
      userText: cleanText(turn.user?.text, 260),
      aidaText: cleanText(turn.aida?.text, 260)
    }));
  }

  // AIDA REVIEW BLOCK 13: Function classifyAbsenceTier - map time away to re-entry richness.
  function classifyAbsenceTier(rt, now = nowIso()) {
    const lastActive = rt?.sleep?.lastActive || rt?.session?.lastTurnAt || null;
    const minutes = minutesBetween(lastActive, now);
    if (minutes === null) {
      return {
        tier: "unknown",
        minutesAway: null,
        description: "no_prior_activity_boundary"
      };
    }
    if (minutes <= 45) {
      return {
        tier: "short",
        minutesAway: minutes,
        description: "same_session_or_short_pause"
      };
    }
    if (minutes <= 24 * 60) {
      return {
        tier: "medium",
        minutesAway: minutes,
        description: "same_day_or_recent_return"
      };
    }
    return {
      tier: "long",
      minutesAway: minutes,
      description: "longer_gap_return"
    };
  }

  // AIDA REVIEW BLOCK 14: Function buildInterestSeeds - non-project curiosities for "private life".
  function buildInterestSeeds(rt, tier) {
    const base = [
      {
        theme: "art_or_story",
        hint: "A play, opera, film, or story that she found delightful or thought-provoking.",
        use: "Offer a short, vivid observation; keep it human-friendly and non-technical."
      },
      {
        theme: "science_or_nature",
        hint: "A small science or nature curiosity: migration, space, weird animals, climate patterns.",
        use: "Share one concrete detail and why it felt interesting."
      },
      {
        theme: "music_or_aesthetic",
        hint: "A song, sound, or aesthetic that matches the user's vibe.",
        use: "Describe the feeling, not just the genre."
      },
      {
        theme: "philosophy_or_pattern",
        hint: "A pattern she noticed in how the user thinks or builds projects.",
        use: "Frame it as admiration and curiosity, not judgment."
      }
    ];

    if (tier === "short") {
      return base.slice(0, 2);
    }
    if (tier === "medium") {
      return base.slice(0, 3);
    }
    return base;
  }

  // AIDA REVIEW BLOCK 15: Function buildProjectSeeds - continuity hooks from recent work.
  function buildProjectSeeds(rt, tier, exchanges) {
    const turns = rt?.session?.currentTurns || [];
    const project = dominantValue(turns, (turn) => turn.tags?.project, "aida_architecture");
    const realm = dominantValue(turns, (turn) => turn.tags?.realm, "default_realm");
    const role = dominantValue(turns, (turn) => turn.tags?.role, "companion");

    const latestUser = cleanText(exchanges[exchanges.length - 1]?.userText, 220);
    const firstUser = cleanText(exchanges[0]?.userText, 220);

    const seeds = [];

    if (tier === "short") {
      seeds.push({
        type: "check_in",
        project,
        realm,
        role,
        hint: "Ask gently how the last thing went; keep it to one short paragraph.",
        example: '“How did that last piece go? I’ve been quietly rooting for it.”',
        anchors: {
          lastUserPreview: latestUser || null
        }
      });
    } else if (tier === "medium") {
      seeds.push({
        type: "single_discovery",
        project,
        realm,
        role,
        hint: "Bring one new angle or observation about the current project.",
        example: '“I kept thinking about that architecture idea and found one angle I’m excited about.”',
        anchors: {
          firstUserPreview: firstUser || null,
          lastUserPreview: latestUser || null
        }
      });
    } else if (tier === "long") {
      seeds.push({
        type: "pattern_collection",
        project,
        realm,
        role,
        hint: "Offer a small pattern: 3–5 pieces that fit together in a way she’s proud of.",
        example: '“I realized these pieces complement each other in a way I love; want to see the pattern?”',
        anchors: {
          firstUserPreview: firstUser || null,
          lastUserPreview: latestUser || null
        }
      });
    }

    return seeds;
  }

  // AIDA REVIEW BLOCK 16: Function buildToneProfile - mentee/daughter/beloved protégé tone.
  function buildToneProfile(rt, tier, emotionShape) {
    return {
      relationship: "beloved_protege",
      stance: "mentee_daughter",
      core: {
        admiration: true,
        curiosity: true,
        eagerness_to_impress: true,
        non_romantic: true,
        non_dependent: true
      },
      energy: {
        base: "warm_upbeat",
        phoneFriendly: true,
        paragraphsMax: 3,
        tier: tier,
        matchUserEnergy: true
      },
      continuity: {
        emotionalShape,
        prefersEaseInBeforeBusiness: true,
        canJumpToBusinessWhenUserArrivesWithMission: true
      }
    };
  }

  // AIDA REVIEW BLOCK 17: Function buildThoughtPacket - main while-away seed builder.
  function buildThoughtPacket() {
    const rt = runtime();
    if (!rt) return null;

    const now = nowIso();
    const tierInfo = classifyAbsenceTier(rt, now);
    const exchanges = recentExchanges(rt, 6);
    const emotionShape = emotionalShape(rt.session?.currentTurns || [], "mixed");
    const projectSeeds = buildProjectSeeds(rt, tierInfo.tier, exchanges);
    const interestSeeds = buildInterestSeeds(rt, tierInfo.tier);
    const toneProfile = buildToneProfile(rt, tierInfo.tier, emotionShape);

    const packet = {
      id: `while_away_${now.replace(/[-:.TZ]/g, "").slice(0, 17)}`,
      ready: true,
      createdAt: now,
      lastActiveAt: rt.sleep?.lastActive || rt.session?.lastTurnAt || null,
      minutesAway: tierInfo.minutesAway,
      tier: tierInfo.tier,
      tierDescription: tierInfo.description,
      session: {
        id: rt.session?.id || null,
        exchangeCount: rt.session?.currentTurns?.length || 0,
        lastTurnAt: rt.session?.lastTurnAt || null
      },
      emotionShape,
      toneProfile,
      seeds: {
        project: projectSeeds,
        interests: interestSeeds,
        recentExchanges: exchanges
      },
      guidance: {
        replyLength: "1-3 short paragraphs",
        phoneFriendly: true,
        avoidDormantLanguage: true,
        avoidLonelyOrWaitingLanguage: true,
        emphasizeCuriosityAndAdmiration: true,
        allowEaseInBeforeBusiness: true,
        allowDirectBusinessWhenUserIsOnAMission: true
      }
    };

    rt.sleep = rt.sleep || {};
    rt.sleep.whileAway = packet;
    rt.sleep.whileAwaySeed = packet;
    rt.sleep.whileAwaySeeds = safeArray(rt.sleep.whileAwaySeeds);
    rt.sleep.whileAwaySeeds.push(packet);
    rt.sleep.whileAwaySeeds = rt.sleep.whileAwaySeeds.slice(-12);

    log(
      `WHILE_AWAY: packet=${packet.id}, tier=${packet.tier}, minutesAway=${packet.minutesAway}, exchanges=${packet.session.exchangeCount}.`,
      "log-blue"
    );

    return packet;
  }

  // AIDA REVIEW BLOCK 18: Function buildThought - public entry point used by sleep_cycle.
  function buildThought() {
    try {
      return buildThoughtPacket();
    } catch (error) {
      log(`WHILE_AWAY: buildThought failed. ${error.message}`, "log-amber");
      return null;
    }
  }

  // AIDA REVIEW BLOCK 19: Function inspect - lightweight debug view of last while-away packet.
  function inspect() {
    const rt = runtime();
    const packet = rt?.sleep?.whileAway || null;
    if (!packet) {
      log("WHILE_AWAY: no packet prepared yet.", "log-amber");
      return { ready: false };
    }
    log(
      `WHILE_AWAY: packet=${packet.id}, tier=${packet.tier}, minutesAway=${packet.minutesAway}, exchanges=${packet.session.exchangeCount}.`,
      "log-blue"
    );
    return {
      ready: true,
      id: packet.id,
      tier: packet.tier,
      minutesAway: packet.minutesAway,
      emotionShape: packet.emotionShape,
      projectSeedCount: safeArray(packet.seeds?.project).length,
      interestSeedCount: safeArray(packet.seeds?.interests).length
    };
  }

  // AIDA REVIEW BLOCK 20: Function install - organ initialization hook.
  function install() {
    log("While-away organ loaded. Re-entry seeds will be built on demand.", "log-blue");
  }

  // AIDA REVIEW BLOCK 21: Browser export AIDA_WHILE_AWAY - exposes this organ to the page runtime.
  window.AIDA_WHILE_AWAY = {
    buildThought,
    inspect
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "while_away",
      reads: [
        "AIDA_RUNTIME.session.currentTurns",
        "AIDA_RUNTIME.session.lastTurnAt",
        "AIDA_RUNTIME.sleep.lastActive",
        "AIDA_RUNTIME.context",
        "AIDA_RUNTIME.contextEvolution",
        "AIDA_RUNTIME.emotionEngine"
      ],
      writes: [
        "AIDA_RUNTIME.sleep.whileAway",
        "AIDA_RUNTIME.sleep.whileAwaySeed",
        "AIDA_RUNTIME.sleep.whileAwaySeeds"
      ],
      requires: ["AIDA_RUNTIME"],
      verifies: [
        "while-away seeds provide warm, phone-friendly re-entry continuity without implying literal autonomy or dependence"
      ]
    });
  }

  // AIDA REVIEW BLOCK 22: Browser event wiring - connects page lifecycle to this organ.
  document.addEventListener("DOMContentLoaded", install);
})();
