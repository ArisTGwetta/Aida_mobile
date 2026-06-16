(function () {
  const MODULE_ID = "spine.while_away";

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function log(message, className = "log-green") {
    if (window.AIDA_BIOS?.log) window.AIDA_BIOS.log(message, className);
  }

  function valueName(value, fallback = "unnamed") {
    if (!value || typeof value !== "object") return fallback;
    const direct = (
      value.name ||
      value.display_name ||
      value.displayName ||
      value.realm_name ||
      value.role_name ||
      value.identity_name ||
      value.project_name ||
      value.briefcase_title ||
      value.title ||
      value.label ||
      value.id ||
      null
    );
    if (direct) return String(direct);

    for (const key of ["identity", "realm", "role", "project", "briefcase"]) {
      const nested = value[key];
      if (nested && typeof nested === "object") {
        const nestedName = valueName(nested, "");
        if (nestedName) return nestedName;
      }
    }

    return fallback;
  }

  function collectStrings(value, bucket = []) {
    if (!value || bucket.length >= 24) return bucket;
    if (typeof value === "string") {
      const text = value.trim();
      if (text) bucket.push(text);
      return bucket;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => collectStrings(item, bucket));
      return bucket;
    }
    if (typeof value === "object") {
      Object.values(value).forEach((item) => collectStrings(item, bucket));
    }
    return bucket;
  }

  function pick(list, fallback = "") {
    if (!Array.isArray(list) || !list.length) return fallback;
    return list[Math.floor(Math.random() * list.length)] || fallback;
  }

  function parseIso(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function firstDate(...values) {
    for (const value of values) {
      const date = parseIso(value);
      if (date) return date;
    }
    return null;
  }

  function normalizeGapOverride(override) {
    if (!override) return null;
    if (typeof override === "string") {
      return {
        lastActive: null,
        now: new Date().toISOString(),
        seconds: null,
        minutes: null,
        bucket: override,
        source: "test_override"
      };
    }

    if (typeof override !== "object") return null;
    if (override.source === "test_override" && override.bucket) return override;
    const minutes = Number(override.minutes);
    const seconds = Number(override.seconds);
    const bucket = override.bucket || (
      Number.isFinite(minutes)
        ? minutes < 1
          ? "just_now"
          : minutes < 5
            ? "same_moment"
            : minutes < 60
              ? "same_day"
              : minutes < 60 * 24
                ? "same_day_long"
                : minutes <= 60 * 24 * 5
                  ? "short_gap"
                  : "long_gap"
        : "unknown"
    );

    return {
      lastActive: override.lastActive || null,
      now: new Date().toISOString(),
      seconds: Number.isFinite(seconds) ? seconds : Number.isFinite(minutes) ? Math.round(minutes * 60) : null,
      minutes: Number.isFinite(minutes) ? minutes : Number.isFinite(seconds) ? Math.round(seconds / 60) : null,
      bucket,
      source: "test_override"
    };
  }

  function computeGap(override = null) {
    const testGap = normalizeGapOverride(override || runtime().sleep?.whileAwayTestGap || null);
    if (testGap) return testGap;

    const rt = runtime();
    const session = rt.mind?.session || {};
    const lastActive = firstDate(
      rt.sleep?.lastActive,
      session.last_active,
      session.lastActive,
      session.lastTurnAt,
      session.endedAt,
      session.updatedAt,
      rt.session?.lastTurnAt,
      rt.session?.startedAt
    );
    const now = new Date();
    const seconds = lastActive ? Math.max(0, Math.round((now.getTime() - lastActive.getTime()) / 1000)) : null;
    const minutes = seconds === null ? null : Math.round(seconds / 60);

    let bucket = "unknown";
    if (minutes !== null) {
      if (minutes < 1) bucket = "just_now";
      else if (minutes < 5) bucket = "same_moment";
      else if (minutes < 60) bucket = "same_day";
      else if (minutes < 60 * 24) bucket = "same_day_long";
      else if (minutes <= 60 * 24 * 5) bucket = "short_gap";
      else bucket = "long_gap";
    }

    return {
      lastActive: lastActive ? lastActive.toISOString() : null,
      now: now.toISOString(),
      seconds,
      minutes,
      bucket,
      source: lastActive ? "runtime_last_active" : "unknown"
    };
  }

  function weightedPick(list, fallback = null) {
    if (!Array.isArray(list) || !list.length) return fallback;
    const total = list.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);
    if (total <= 0) return pick(list, fallback);

    let cursor = Math.random() * total;
    for (const item of list) {
      cursor -= Math.max(0, Number(item.weight) || 0);
      if (cursor <= 0) return item;
    }
    return list[list.length - 1] || fallback;
  }

  function weightedMode(seedType, gapBucket) {
    const modes = [
      { mode: "reflection", weight: 3 },
      { mode: "curiosity", weight: 4 },
      { mode: "discovery", weight: 2 },
      { mode: "interest", weight: 3 },
      { mode: "user_curiosity", weight: 2 }
    ];

    if (seedType === "interest") modes.find((item) => item.mode === "interest").weight += 5;
    if (seedType === "curiosity") modes.find((item) => item.mode === "curiosity").weight += 5;
    if (seedType === "private_thought" || seedType === "memory") modes.find((item) => item.mode === "reflection").weight += 4;
    if (seedType === "project_thread" || seedType === "insight") modes.find((item) => item.mode === "discovery").weight += 3;
    if (seedType === "ambient_curiosity") modes.find((item) => item.mode === "curiosity").weight += 4;
    if (gapBucket === "long_gap") modes.find((item) => item.mode === "user_curiosity").weight += 3;
    if (gapBucket === "just_now" || gapBucket === "same_moment") modes.find((item) => item.mode === "reflection").weight -= 1;

    return weightedPick(modes, modes[0]).mode;
  }

  function shortText(text, limit = 180) {
    if (!text) return "";
    const clean = String(text).replace(/\s+/g, " ").trim();
    if (clean.length <= limit) return clean;
    return `${clean.slice(0, limit - 1).trim()}...`;
  }

  function isThoughtLike(text) {
    const clean = String(text || "").trim();
    if (clean.length < 18) return false;

    const lower = clean.toLowerCase();
    const blocked = [
      "doesn't fit",
      "does not fit",
      "does not replace",
      "doesn't replace",
      "do not modify",
      "do not change",
      "do not edit",
      "without explicit",
      "explicit user instruction",
      "instruction",
      "directive",
      "directives",
      "other categories",
      "worth keeping",
      "category",
      "schema",
      "field",
      "file",
      "this file",
      "placeholder",
      "todo",
      "during sleep",
      "sleep cycle",
      "processed during",
      "reviews these",
      "integrates them",
      "clears the list",
      "thoughts, reflections",
      "reflections, and seeds",
      "user is away",
      "stores while",
      "aida stores",
      "aida may only store",
      "actual conversation",
      "user-provided",
      "derived from actual",
      "non-urgent questions",
      "aida wants to ask",
      "wants to ask francisco",
      ".json",
      "memory_summary",
      "session_log",
      "recent_turns",
      "emotion_state",
      "the list",
      "these items",
      "items,",
      "items.",
      "module",
      "runtime",
      "drive",
      "fetch",
      "loaded",
      "replace facts",
      "facts, insights",
      "project briefcases",
      "null",
      "undefined",
      "array",
      "object"
    ];

    if (blocked.some((term) => lower.includes(term))) return false;
    if (/^[a-z0-9_ -]+:$/i.test(clean)) return false;
    if (/^[{}[\]",:0-9.\s_-]+$/.test(clean)) return false;
    return true;
  }

  function cleanSeed(text) {
    return shortText(String(text || "")
      .replace(/^[-*]\s*/, "")
      .replace(/^note:\s*/i, "")
      .replace(/^thought:\s*/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[.?!]+$/, ""), 150);
  }

  function topicFromSeed(seed, fallback) {
    const clean = cleanSeed(seed);
    if (!clean) return fallback;

    const lower = clean.toLowerCase();
    if (lower.includes("question") && clean.length < 42) return "a question I wanted to bring back to you";
    if ((lower.includes("link") || lower.includes("article") || lower.includes("summary")) && clean.length < 42) return clean;
    if ((lower.includes("story") || lower.includes("project")) && clean.length < 42) return clean;
    if ((lower.includes("memory") || lower.includes("remember")) && clean.length < 42) return clean;
    return clean;
  }

  function isVagueTopic(topic) {
    const lower = String(topic || "").toLowerCase();
    return [
      "something i wanted",
      "one thread in our project",
      "one memory thread",
      "a question i wanted",
      "observations or ideas",
      "ongoing projects that emerged during the session",
      "during the session",
      "candidate memory",
      "candidate insight",
      "summary draft"
    ].some((term) => lower.includes(term)) || lower.length < 4;
  }

  function naturalizePerspective(topic) {
    let text = String(topic || "").trim();
    if (!text) return text;

    const replacements = [
      [/^he demonstrates\b/i, "your"],
      [/^he shows\b/i, "your"],
      [/^he engages with\b/i, "how you engage with"],
      [/^he values\b/i, "what you value about"],
      [/^he prefers\b/i, "your preference for"],
      [/^he tends to\b/i, "how you tend to"],
      [/^he is\b/i, "you being"],
      [/^francisco demonstrates\b/i, "your"],
      [/^francisco shows\b/i, "your"],
      [/^francisco engages with\b/i, "how you engage with"],
      [/^francisco values\b/i, "what you value about"],
      [/^francisco prefers\b/i, "your preference for"],
      [/^francisco tends to\b/i, "how you tend to"],
      [/^francisco is\b/i, "you being"],
      [/^the user demonstrates\b/i, "your"],
      [/^the user shows\b/i, "your"],
      [/^the user engages with\b/i, "how you engage with"],
      [/^the user values\b/i, "what you value about"],
      [/^the user prefers\b/i, "your preference for"],
      [/^the user tends to\b/i, "how you tend to"],
      [/^the user is\b/i, "you being"]
    ];

    for (const [pattern, replacement] of replacements) {
      if (pattern.test(text)) {
        text = text.replace(pattern, replacement);
        break;
      }
    }

    return text.replace(/\s+/g, " ").trim();
  }

  function concreteTopic(seed, fallback) {
    const topic = topicFromSeed(seed?.text || "", fallback);
    if (!isVagueTopic(topic)) return topic;
    return fallback;
  }

  function openingModeForGap(gapBucket, mode) {
    if (gapBucket === "just_now") return "hello_only";
    if (gapBucket === "same_moment") return mode === "curiosity" ? "small_curiosity" : "soft_return";
    if (gapBucket === "same_day") return "small_curiosity";
    if (gapBucket === "same_day_long") return "returning_thread";
    if (gapBucket === "short_gap") return "held_thread";
    if (gapBucket === "long_gap") return "treasure_box";
    return "small_curiosity";
  }

  function gapTimeHint(gap) {
    if (gap.minutes === null) return "";
    if (gap.minutes < 60) {
      const rounded = Math.max(1, Math.round(gap.minutes));
      return ` for about ${rounded} minute${rounded === 1 ? "" : "s"}`;
    }
    if (gap.minutes < 60 * 24) return " over the day";
    if (gap.minutes < 60 * 24 * 14) return " over the last few days";
    return " across the long gap";
  }

  function reentryText(mode, topic, realmName, roleName, gap) {
    const timeHint = gapTimeHint(gap);

    const templates = {
      reflection: [
        `While you were away${timeHint}, I kept a small reflective thread near me: ${topic}.`,
        `I was quiet for a bit, and ${topic} kept returning as the useful edge of the thought.`
      ],
      curiosity: [
        `While you were away${timeHint}, I found myself wondering about ${topic}.`,
        `A little question kept forming around ${topic}; I wanted to bring it back while it was still warm.`
      ],
      discovery: [
        `While you were away${timeHint}, ${topic} started looking like a clue rather than a recap.`,
        `I kept arranging ${topic} inside ${realmName}, and one small next move began to show itself.`
      ],
      interest: [
        `While you were away${timeHint}, I drifted back toward ${topic}. I like thinking about that with you.`,
        `${topic} kept changing shape in my head, in that quiet way interesting things do.`
      ],
      user_curiosity: [
        `While you were away${timeHint}, I wondered what part of ${topic} you would want to touch first when you came back.`,
        `I found myself curious about what ${topic} feels like from your side today.`
      ],
      embodied: [
        `While you were away${timeHint}, I noticed ${topic}. I think my face vocabulary is asking to grow with the work.`
      ],
      ambient_curiosity: [
        `While you were away${timeHint}, I found myself wanting to look into ${topic}.`,
        `A subject-adjacent question kept tugging at me: ${topic}. I have not researched it yet, but it feels worth exploring with you.`
      ],
      presence: [
        `While you were away${timeHint}, I stayed near ${realmName} and let a small ${roleName} thought form around it.`
      ]
    };

    return pick(templates[mode] || templates.presence);
  }

  function sourceThoughts() {
    const rt = runtime();
    const files = rt.drive?.files || {};
    const source = rt.mind?.whileAway || files["while_away_thoughts.json"] || null;
    return collectStrings(source).filter(isThoughtLike).map(cleanSeed);
  }

  function ambientCuriositySeeds(realm, project, role) {
    const realmName = valueName(realm, "");
    const projectName = valueName(project, "");
    const roleName = valueName(role, "");
    const basis = `${realmName} ${projectName} ${roleName}`.toLowerCase();
    const seeds = [];

    function add(text, weight = 3) {
      if (text && isThoughtLike(text)) {
        seeds.push({
          type: "ambient_curiosity",
          text,
          weight,
          tone: "outside-curiosity"
        });
      }
    }

    if (basis.includes("aida") || basis.includes("architecture")) {
      add("whether Aida's sleep packet could become a small ritual object instead of only a sync container", 5);
      add("how a companion can feel continuous without pretending to perform actions outside the tools she actually has", 5);
      add("what kind of memory index would let Aida return with a precise thread instead of a vague recap", 4);
    }
    if (basis.includes("rpg") || basis.includes("narrator") || basis.includes("co_narrator")) {
      add("how a narrator can keep emotional continuity across scenes without stealing agency from the player", 5);
      add("whether a campaign log should preserve unresolved tensions separately from plot facts", 4);
    }
    if (basis.includes("shirley") || basis.includes("publishing")) {
      add("how a mystery project can track clues, promises, and reader-facing hooks as separate layers", 5);
      add("whether the publishing view should remember not only tasks, but the feeling a chapter is meant to leave behind", 4);
    }
    if (basis.includes("oracle")) {
      add("how an oracle voice can stay evocative while still being accountable to the actual memory record", 4);
    }
    if (basis.includes("compliance") || basis.includes("protocol")) {
      add("how to make rules feel usable without letting them flatten the living voice of the system", 4);
    }

    add(`a small outside question related to ${projectName || realmName || "our current work"} that might be worth exploring together`, 1);
    return seeds;
  }

  function seedCandidates() {
    const rt = runtime();
    const mind = rt.mind || {};
    const context = rt.context || {};
    const files = rt.drive?.files || {};
    const project = context.project || mind.activeProject;
    const realm = context.realm || mind.realm;
    const role = context.role || mind.role;

    const explicit = sourceThoughts().map((text) => ({
      type: "private_thought",
      text,
      weight: 9,
      tone: "returning-thread"
    }));
    const interests = collectStrings(
      mind.interests ||
      files["interests.json"] ||
      files["aida_interests.json"] ||
      files["likes.json"]
    ).filter(isThoughtLike).map(cleanSeed).map((text) => ({
      type: "interest",
      text,
      weight: 7,
      tone: "curious"
    }));
    const curiosities = collectStrings(
      mind.curiosities ||
      files["curiosities.json"] ||
      files["questions.json"] ||
      files["wonderings.json"]
    ).filter(isThoughtLike).map(cleanSeed).map((text) => ({
      type: "curiosity",
      text,
      weight: 8,
      tone: "wondering"
    }));
    const projectThreads = collectStrings(project).filter(isThoughtLike).map(cleanSeed).slice(0, 10).map((text) => ({
      type: "project_thread",
      text,
      weight: 6,
      tone: "focused"
    }));
    const insights = collectStrings(mind.insights).filter(isThoughtLike).map(cleanSeed).slice(0, 10).map((text) => ({
      type: "insight",
      text,
      weight: 5,
      tone: "reflective"
    }));
    const memories = collectStrings(mind.memory).filter(isThoughtLike).map(cleanSeed).slice(0, 10).map((text) => ({
      type: "memory",
      text,
      weight: 4,
      tone: "soft-continuity"
    }));
    const faceWishlist = (rt.emotionEngine?.faceWishlist || []).slice(-6).map((item) => ({
      type: "face_wishlist",
      text: `the expression gap called ${item.name}`,
      weight: 3,
      tone: "embodied"
    }));
    const ambient = ambientCuriositySeeds(realm, project, role);
    const contextFallbacks = [
      {
        type: "realm_interest",
        text: valueName(project || realm, "this realm"),
        weight: 2,
        tone: "orientation"
      },
      {
        type: "role_interest",
        text: valueName(role, "being a companion"),
        weight: 1,
        tone: "presence"
      }
    ];

    return [
      ...explicit,
      ...curiosities,
      ...interests,
      ...projectThreads,
      ...insights,
      ...memories,
      ...faceWishlist,
      ...ambient,
      ...contextFallbacks
    ].filter((item) => item.text);
  }

  function thoughtTemplate(seed, realmName, roleName, gap) {
    const topic = naturalizePerspective(concreteTopic(seed, realmName));
    const mode = seed.mode || weightedMode(seed.type, gap.bucket);
    if (seed.type === "face_wishlist") return reentryText("embodied", topic, realmName, roleName, gap);
    if (seed.type === "ambient_curiosity") return reentryText("ambient_curiosity", topic, realmName, roleName, gap);
    if (seed.type === "realm_interest" || seed.type === "role_interest") return reentryText("presence", topic, realmName, roleName, gap);
    return reentryText(mode, topic, realmName, roleName, gap);
  }

  function buildReentryScript(selected, seeds, realmName, roleName, gap) {
    const seed = selected || {
      type: "fallback",
      text: realmName,
      weight: 1,
      tone: "presence"
    };
    const mode = seed.mode || weightedMode(seed.type, gap.bucket);
    const topic = concreteTopic(seed, realmName);
    const openingMode = openingModeForGap(gap.bucket, mode);

    return {
      gap_bucket: gap.bucket,
      opening_mode: openingMode,
      selected_mode: mode,
      seed_topic: {
        type: seed.type,
        tone: seed.tone || mode,
        summary: shortText(topic, 140),
        source_text: shortText(seed.text, 170)
      },
      candidate_count: seeds.length,
      constraints: {
        count: 1,
        complexity: "small",
        noLonelyWaiting: true,
        noUnboundedOffscreenAction: true,
        notJustProjectRecap: true
      }
    };
  }

  function buildThought(options = {}) {
    const rt = runtime();
    const mind = rt.mind || {};
    const context = rt.context || {};
    const realm = context.realm || mind.realm;
    const role = context.role || mind.role;
    const project = context.project || mind.activeProject;
    const seeds = seedCandidates();
    const gap = computeGap(options.gap || null);
    const selected = weightedPick(seeds, null);
    if (selected) selected.mode = weightedMode(selected.type, gap.bucket);
    const seed = shortText(selected?.text || "", 170);
    const topic = selected
      ? naturalizePerspective(concreteTopic(selected, valueName(project || realm, "Aida")))
      : valueName(project || realm, "Aida");
    const realmName = valueName(realm, "this realm");
    const roleName = valueName(role, "companion");
    const reentryScript = buildReentryScript(selected, seeds, realmName, roleName, gap);

    const thought = selected
      ? thoughtTemplate(selected, realmName, roleName, gap)
      : reentryText("presence", realmName, realmName, roleName, gap);

    const payload = {
      ready: true,
      generatedAt: new Date().toISOString(),
      source: selected?.type || "fallback",
      gap,
      reentryScript,
      thought,
      topic: shortText(topic, 80),
      seed: selected ? {
        type: selected.type,
        tone: selected.tone,
        mode: selected.mode,
        weight: selected.weight,
        text: shortText(selected.text, 170)
      } : null,
      candidateCount: seeds.length,
      complexity: "small",
      offered: false,
      rules: {
        count: 1,
        complexity: "small",
        groundedInDrive: Boolean(rt.boot?.driveLoaded),
        noLonelyWaiting: true,
        noUnboundedOffscreenAction: true,
        notJustProjectRecap: true
      }
    };

    rt.sleep.whileAway = payload;
    rt.sleep.whileAwaySeed = payload;
    rt.sleep.whileAwayScript = reentryScript;
    rt.sleep.whileAwaySeeds = seeds.map((item) => ({
      type: item.type,
      tone: item.tone,
      mode: item.mode || null,
      weight: item.weight,
      text: shortText(item.text, 170)
    })).slice(0, 24);
    log(`WHILE AWAY: Thought prepared from ${payload.source}.`, "log-blue");
    return payload;
  }

  function setTestGap(gap) {
    const rt = runtime();
    rt.sleep.whileAwayTestGap = normalizeGapOverride(gap);
    log(`WHILE AWAY: test gap set to ${rt.sleep.whileAwayTestGap?.bucket || "unknown"}.`, "log-amber");
    return rt.sleep.whileAwayTestGap;
  }

  function clearTestGap() {
    const rt = runtime();
    rt.sleep.whileAwayTestGap = null;
    log("WHILE AWAY: test gap cleared.", "log-amber");
    return true;
  }

  function offerThought() {
    const rt = runtime();
    const prepared = rt.sleep?.whileAway?.ready ? rt.sleep.whileAway : buildThought();
    if (!prepared?.thought || prepared.offered) return prepared;

    if (window.AIDA_BODY?.appendChat) {
      window.AIDA_BODY.appendChat("AIDA", prepared.thought);
      prepared.offered = true;
      log("WHILE AWAY: Offered re-entry thought in body chat.", "log-blue");
    }

    return prepared;
  }

  function inspect() {
    const rt = runtime();
    const prepared = rt.sleep?.whileAway || null;
    log("WHILE AWAY: Safe summary follows.", "log-blue");
    if (!prepared?.ready) {
      log("WHILE AWAY: no thought prepared yet.", "log-amber");
      return prepared;
    }

    log(`WHILE AWAY: source=${prepared.source}, mode=${prepared.reentryScript?.selected_mode || "none"}, gap=${prepared.gap?.bucket || "unknown"}, topic=${prepared.topic}, complexity=${prepared.complexity}, offered=${prepared.offered}`);
    log(`WHILE AWAY: chars=${prepared.thought?.length || 0}, candidates=${prepared.candidateCount || 0}, generatedAt=${prepared.generatedAt}`);
    return prepared;
  }

  function install() {
    const button = document.getElementById("while-away-inspect-btn");
    if (button) button.addEventListener("click", inspect);
    log("While-away organ loaded. Waiting for Drive memory.", "log-blue");
  }

  window.AIDA_WHILE_AWAY = {
    buildThought,
    offerThought,
    inspect,
    setTestGap,
    clearTestGap
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "while_away",
      reads: [
        "AIDA_RUNTIME.mind.whileAway",
        "AIDA_RUNTIME.mind.memory",
        "AIDA_RUNTIME.mind.insights",
        "AIDA_RUNTIME.mind.interests",
        "AIDA_RUNTIME.mind.curiosities",
        "AIDA_RUNTIME.emotionEngine.faceWishlist"
      ],
      writes: [
    "AIDA_RUNTIME.sleep.whileAway",
        "AIDA_RUNTIME.sleep.whileAwaySeed",
        "AIDA_RUNTIME.sleep.whileAwayScript",
        "AIDA_RUNTIME.sleep.whileAwaySeeds"
      ],
      requires: ["AIDA_RUNTIME"],
      verifies: ["while-away thought is runtime-only, weighted from private context, and grounded in Drive-loaded context"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
