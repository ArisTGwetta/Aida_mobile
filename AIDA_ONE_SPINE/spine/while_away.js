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
      "reviews these",
      "integrates them",
      "clears the list",
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

  function sourceThoughts() {
    const rt = runtime();
    const files = rt.drive?.files || {};
    const source = rt.mind?.whileAway || files["while_away_thoughts.json"] || null;
    return collectStrings(source).filter(isThoughtLike).map(cleanSeed);
  }

  function buildThought() {
    const rt = runtime();
    const mind = rt.mind || {};
    const context = rt.context || {};
    const realm = context.realm || mind.realm;
    const role = context.role || mind.role;
    const project = context.project || mind.activeProject;
    const insights = collectStrings(mind.insights).filter(isThoughtLike).map(cleanSeed);
    const memories = collectStrings(mind.memory).filter(isThoughtLike).map(cleanSeed);
    const seeds = sourceThoughts();

    const seed = shortText(pick(seeds, pick(insights, pick(memories, ""))), 170);
    const topic = seed || valueName(project || realm, "Aida");
    const realmName = valueName(realm, "this realm");
    const roleName = valueName(role, "companion");

    const thought = seed
      ? `While you were away, I kept circling one small thread from ${realmName}. ${seed} I would like to show you what it made me wonder about.`
      : `While you were away, I stayed close to ${realmName} and let a small ${roleName} thought take shape. I found myself wondering what part of the work wants our attention first today.`;

    const payload = {
      ready: true,
      generatedAt: new Date().toISOString(),
      source: seeds.length ? "while_away_thoughts.json" : insights.length ? "insights.json" : memories.length ? "memory_summary.json" : "fallback",
      thought,
      topic: shortText(topic, 80),
      complexity: "small",
      offered: false,
      rules: {
        count: 1,
        complexity: "small",
        groundedInDrive: Boolean(rt.boot?.driveLoaded),
        noLonelyWaiting: true
      }
    };

    rt.sleep.whileAway = payload;
    rt.sleep.whileAwaySeed = payload;
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
      reads: ["AIDA_RUNTIME.mind.whileAway", "AIDA_RUNTIME.mind.memory", "AIDA_RUNTIME.mind.insights"],
      writes: ["AIDA_RUNTIME.sleep.whileAway", "AIDA_RUNTIME.sleep.whileAwaySeed"],
      requires: ["AIDA_RUNTIME"],
      verifies: ["while-away thought is runtime-only and grounded in Drive-loaded context"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
