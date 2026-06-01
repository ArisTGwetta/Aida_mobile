(function () {
  const MODULE_ID = "spine.context.inspector";

  function $(id) {
    return document.getElementById(id);
  }

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function log(message, className = "log-green") {
    const logs = $("bios-logs");
    if (logs) {
      const line = document.createElement("div");
      line.className = className;
      line.textContent = `>>> ${message}`;
      logs.appendChild(line);
      logs.scrollTop = logs.scrollHeight;
    }

    if (window.AIDA_BODY?.pulse) {
      window.AIDA_BODY.pulse(message);
    }
  }

  function valueName(value) {
    if (!value || typeof value !== "object") return null;
    return (
      value.name ||
      value.title ||
      value.label ||
      value.id ||
      value.filename ||
      value.briefcase_name ||
      null
    );
  }

  function countArrayLike(value) {
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") return Object.keys(value).length;
    return 0;
  }

  function findLikelyCount(obj, keys) {
    if (!obj || typeof obj !== "object") return 0;
    for (const key of keys) {
      if (obj[key]) return countArrayLike(obj[key]);
    }
    return countArrayLike(obj);
  }

  function emotionSummary(emotion) {
    if (!emotion || typeof emotion !== "object") return "missing";
    const label = emotion.label || emotion.emotion || emotion.state || "unlabeled";
    const valence = emotion.valence ?? emotion.v ?? "n/a";
    const arousal = emotion.arousal ?? emotion.a ?? "n/a";
    return `${label} (valence=${valence}, arousal=${arousal})`;
  }

  function preLlmGate(summary) {
    const missing = [];
    if (!summary.identity.present) missing.push("identity");
    if (!summary.realm.present) missing.push("active realm");
    if (!summary.role.present) missing.push("active role");
    if (!summary.facts.present) missing.push("facts");
    if (!summary.memory.present) missing.push("memory summary");
    if (!summary.emotion.present) missing.push("emotion");

    return {
      pass: missing.length === 0,
      missing
    };
  }

  function buildContextSummary() {
    const rt = runtime();
    const mind = rt.mind || {};
    const context = rt.context || {};
    const driveFiles = rt.drive?.files || {};

    const identity = context.identity || mind.identity;
    const realm = context.realm || mind.realm;
    const role = context.role || mind.role;
    const facts = context.projectFacts || mind.facts;
    const memory = context.projectSummaries || mind.memory;
    const emotion = context.emotion || mind.emotion;
    const recentTurns = context.memoryWindow?.recentTurns || driveFiles["recent_turns.json"];
    const session = context.memoryWindow?.session || mind.session;

    const summary = {
      boot: {
        phase: rt.boot?.phase || "unknown",
        driveConnected: Boolean(rt.boot?.driveConnected),
        driveLoaded: Boolean(rt.boot?.driveLoaded),
        airlockCleared: Boolean(rt.boot?.airlockCleared),
        mindReady: Boolean(rt.boot?.mindReady)
      },
      drive: {
        fileCount: Object.keys(driveFiles).length,
        folderIdPresent: Boolean(rt.drive?.folderId)
      },
      identity: {
        present: Boolean(identity),
        name: valueName(identity) || "unnamed"
      },
      realm: {
        present: Boolean(realm),
        name: valueName(realm) || "unnamed",
        loadedCount: countArrayLike(mind.realms)
      },
      role: {
        present: Boolean(role),
        name: valueName(role) || "unnamed",
        loadedCount: countArrayLike(mind.roles)
      },
      project: {
        active: Boolean(mind.activeProject || context.project),
        name: valueName(mind.activeProject || context.project) || "no_active_project",
        loadedCount: countArrayLike(mind.projects)
      },
      facts: {
        present: Boolean(facts),
        count: findLikelyCount(facts, ["facts", "items", "user", "system"])
      },
      memory: {
        present: Boolean(memory),
        count: findLikelyCount(memory, ["summaries", "summary", "recent_interactions", "long_term"])
      },
      insights: {
        present: Boolean(mind.insights),
        count: findLikelyCount(mind.insights, ["insights", "themes", "patterns"])
      },
      session: {
        present: Boolean(session),
        count: findLikelyCount(session, ["turns", "recent_turns", "entries", "session_log"])
      },
      recentTurns: {
        present: Boolean(recentTurns),
        count: findLikelyCount(recentTurns, ["turns", "recent_turns", "entries"])
      },
      emotion: {
        present: Boolean(emotion),
        summary: emotionSummary(emotion)
      }
    };

    summary.preLlmGate = preLlmGate(summary);
    return summary;
  }

  function inspectContext() {
    const summary = buildContextSummary();
    const gate = summary.preLlmGate;

    log("CONTEXT: Safe summary follows.", "log-blue");
    log(`BOOT: phase=${summary.boot.phase}, driveLoaded=${summary.boot.driveLoaded}, airlock=${summary.boot.airlockCleared}`);
    log(`DRIVE: files=${summary.drive.fileCount}, folderId=${summary.drive.folderIdPresent}`);
    log(`IDENTITY: ${summary.identity.present ? summary.identity.name : "missing"}`);
    log(`REALM: ${summary.realm.name} (${summary.realm.loadedCount} loaded)`);
    log(`ROLE: ${summary.role.name} (${summary.role.loadedCount} loaded)`);
    log(`PROJECT: ${summary.project.name} (${summary.project.loadedCount} loaded)`);
    log(`FACTS: present=${summary.facts.present}, count=${summary.facts.count}`);
    log(`MEMORY: present=${summary.memory.present}, count=${summary.memory.count}`);
    log(`INSIGHTS: present=${summary.insights.present}, count=${summary.insights.count}`);
    log(`SESSION: present=${summary.session.present}, count=${summary.session.count}`);
    log(`RECENT TURNS: present=${summary.recentTurns.present}, count=${summary.recentTurns.count}`);
    log(`EMOTION: ${summary.emotion.summary}`);

    if (gate.pass) {
      log("PRE-LLM GATE: PASS. Required context is present.", "log-blue");
    } else {
      log(`PRE-LLM GATE: WAIT. Missing ${gate.missing.join(", ")}.`, "log-amber");
    }

    window.AIDA_CONTEXT_SUMMARY = summary;
    return summary;
  }

  function install() {
    const button = $("context-inspect-btn");
    if (button) button.addEventListener("click", inspectContext);
    log("Context inspector loaded.", "log-blue");
  }

  window.AIDA_CONTEXT_INSPECTOR = {
    inspect: inspectContext,
    buildSummary: buildContextSummary
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "context_inspection",
      reads: ["AIDA_RUNTIME.drive.files", "AIDA_RUNTIME.mind", "AIDA_RUNTIME.context"],
      writes: ["window.AIDA_CONTEXT_SUMMARY"],
      requires: ["AIDA_RUNTIME"],
      verifies: ["pre-LLM context gate reports pass/wait without dumping private content"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
