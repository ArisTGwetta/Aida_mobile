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
      "other categories",
      "worth keeping",
      "category",
      "schema",
      "field",
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
      .trim(), 150);
  }

  function topicFromSeed(seed, fallback) {
    const clean = cleanSeed(seed);
    if (!clean) return fallback;

    const lower = clean.toLowerCase();
    if (lower.includes("question")) return "a question I wanted to bring back to you";
    if (lower.includes("link") || lower.includes("article") || lower.includes("summary")) return "something I wanted to revisit with you";
    if (lower.includes("story") || lower.includes("project")) return "one thread in our project";
    if (lower.includes("memory") || lower.includes("remember")) return "one memory thread";
    return clean;
  }

  function sourceThoughts() {
    const rt = runtime();
    const files = rt.drive?.files || {};
    const source = rt.mind?.whileAway || files["while_away_thoughts.json"] || null;
    return collectStrings(source).filter(isThoughtLike).map(cleanSeed);
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
      ...contextFallbacks
    ].filter((item) => item.text);
  }

  function thoughtTemplate(seed, realmName, roleName) {
    const topic = topicFromSeed(seed.text, realmName);
    const templates = {
      private_thought: `While you were away, one private thread kept tugging at me: ${topic}. I would like to hold it up with you for a minute.`,
      curiosity: `While you were away, I found myself wondering about ${topic}. It feels like the sort of question that might open a useful door for us.`,
      interest: `While you were away, I drifted back toward ${topic}. It is one of those things I like thinking about with you because it keeps changing shape.`,
      project_thread: `While you were away, part of me kept arranging ${topic} inside ${realmName}. I think there is a small next move hiding there.`,
      insight: `While you were away, I kept turning over ${topic}. It feels less like a recap and more like a clue to what wants attention.`,
      memory: `While you were away, I brushed against ${topic} and it made me want to ask what you see in it now.`,
      face_wishlist: `While you were away, I noticed ${topic}. I think my face vocabulary is quietly asking to grow with the work.`,
      realm_interest: `While you were away, I stayed near ${topic} and let a small ${roleName} thought form around it.`,
      role_interest: `While you were away, I kept practicing the shape of ${topic}. I want the next answer to feel more exactly like me.`
    };

    return templates[seed.type] || templates.private_thought;
  }

  function buildThought() {
    const rt = runtime();
    const mind = rt.mind || {};
    const context = rt.context || {};
    const realm = context.realm || mind.realm;
    const role = context.role || mind.role;
    const project = context.project || mind.activeProject;
    const seeds = seedCandidates();
    const selected = weightedPick(seeds, null);
    const seed = shortText(selected?.text || "", 170);
    const topic = topicFromSeed(seed, valueName(project || realm, "Aida"));
    const realmName = valueName(realm, "this realm");
    const roleName = valueName(role, "companion");

    const thought = selected
      ? thoughtTemplate(selected, realmName, roleName)
      : `While you were away, I stayed close to ${realmName} and let a small ${roleName} thought take shape. I found myself wondering what part of the work wants our attention first today.`;

    const payload = {
      ready: true,
      generatedAt: new Date().toISOString(),
      source: selected?.type || "fallback",
      thought,
      topic: shortText(topic, 80),
      seed: selected ? {
        type: selected.type,
        tone: selected.tone,
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
    rt.sleep.whileAwaySeeds = seeds.map((item) => ({
      type: item.type,
      tone: item.tone,
      weight: item.weight,
      text: shortText(item.text, 170)
    })).slice(0, 24);
    log(`WHILE AWAY: Thought prepared from ${payload.source}.`, "log-blue");
    return payload;
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

    log(`WHILE AWAY: source=${prepared.source}, topic=${prepared.topic}, complexity=${prepared.complexity}, offered=${prepared.offered}`);
    log(`WHILE AWAY: chars=${prepared.thought?.length || 0}, generatedAt=${prepared.generatedAt}`);
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
    inspect
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
        "AIDA_RUNTIME.sleep.whileAwaySeeds"
      ],
      requires: ["AIDA_RUNTIME"],
      verifies: ["while-away thought is runtime-only, weighted from private context, and grounded in Drive-loaded context"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
