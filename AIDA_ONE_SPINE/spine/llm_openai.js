(function () {
  const MODULE_ID = "spine.llm.conversation";

  function $(id) {
    return document.getElementById(id);
  }

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function config() {
    return window.AIDA_CONFIG || {};
  }

  function log(message, className = "log-green") {
    if (window.AIDA_BIOS?.log) {
      window.AIDA_BIOS.log(message, className);
      return;
    }

    const logs = $("bios-logs");
    if (!logs) return;
    const line = document.createElement("div");
    line.className = className;
    line.textContent = `>>> ${message}`;
    logs.appendChild(line);
    logs.scrollTop = logs.scrollHeight;
  }

  function pulse(message) {
    if (window.AIDA_BODY?.pulse) window.AIDA_BODY.pulse(message);
  }

  function appendChat(role, text, options = {}) {
    if (window.AIDA_BODY?.appendChat) {
      return window.AIDA_BODY.appendChat(role, text, options);
    }

    const flow = $("chat-flow");
    if (!flow) return null;
    const line = document.createElement("div");
    line.className = `line ${role}`;
    line.textContent = text;
    flow.appendChild(line);
    flow.scrollTop = flow.scrollHeight;
    return line;
  }

  function setPendingText(line, text) {
    const content = line?.querySelector?.(".line-text");
    if (content) content.textContent = text;
    else if (line) line.textContent = text;
  }

  function projectCommand(text) {
    const value = String(text || "").trim();
    const match = value.match(/^\s*#(?:newproject|new-project|project)\s+(.+?)\s*$/i);
    const natural = value.match(/^(?:(?:let'?s|let us)\s+)?(?:start|begin|create|open)\s+(?:a\s+)?(?:new\s+)?(?:story|project)\s+(?:called|named|titled)\s+["“”']?(.+?)["“”']?[.!]*$/i) ||
      value.match(/^(?:new\s+)?(?:story|project)\s*:\s*["“”']?(.+?)["“”']?\s*$/i);
    if (natural) return { realm: null, name: natural[1].trim() };
    if (!match) return null;
    const payload = match[1].trim();
    const realmMatch = payload.match(/^#([a-z0-9_-]+)\s+(.+)$/i);
    return realmMatch
      ? { realm: realmMatch[1], name: realmMatch[2].trim() }
      : { realm: null, name: payload };
  }

  function isAdoptHistoryCommand(text) {
    return /^\s*#(?:adopthistory|adopt-history)\s*$/i.test(String(text || ""));
  }

  function meditationScopeRequest(text) {
    const value = String(text || "").toLowerCase();
    if (!/\bmeditat(?:e|ion)\b/.test(value)) return null;
    if (/\b(?:all llms|all models|across llms|across models|every llm)\b/.test(value)) return "all";
    return "current";
  }

  function isFreshGlanceRequest(text) {
    return /\b(?:fresh glance|review (?:our |the )?(?:recent )?logs|look (?:over|through) (?:our |the )?(?:recent )?logs|what (?:did you notice|stands out) in (?:our |the )?logs|catch me up from (?:our |the )?logs)\b/i.test(String(text || ""));
  }

  function isFreshGlanceSourcesRequest(text) {
    return /\b(?:show|give|list)\s+(?:me\s+)?(?:the\s+)?sources?\s+(?:for|from)\s+(?:that|the)\s+(?:fresh\s+)?glance\b/i.test(String(text || ""));
  }

  function isMemoryOverviewRequest(text) {
    return /\b(?:what do (?:we|you) have|review what (?:we|you) have|give me (?:a )?(?:quick )?(?:memory|project) summary|summarize (?:your|our|the) memory|show me around (?:your|the) memory|help me navigate (?:your|the) memory)\b/i.test(String(text || ""));
  }

  function projectReconciliationRequest(text) {
    const value = String(text || "").trim();
    if (/^(?:cancel|never mind|nevermind|stop)(?: the)? (?:merge|reconciliation)|^(?:cancel|never mind|nevermind)$/i.test(value)) {
      return { action: "cancel" };
    }
    if (/^(?:yes|yes please|confirm|okay|ok)[, ]+(?:merge|combine|reconcile)(?: them| the projects?)?[.!]*$/i.test(value) ||
        /^(?:merge|combine|reconcile) them now[.!]*$/i.test(value)) {
      return { action: "confirm" };
    }
    if (/\b(?:compare|reconcile|merge|combine)\b.*\b(?:projects?|stories|versions|copies|duplicates?|instances?)\b/i.test(value) ||
        /\b(?:two|both|duplicate)\b.*\b(?:bard|project|story)\b/i.test(value)) {
      return { action: "compare", query: value };
    }
    return null;
  }

  function projectSummaryRequest(text) {
    const value = String(text || "").trim();
    const match = value.match(/^(?:summarize|review|catch me up on|what do (?:you|we) (?:have|remember) (?:about|for))\s+(?:the\s+)?(?:project|story)?\s*(.+?)\s*[?.!]*$/i);
    return match?.[1] ? { query: match[1].trim() } : null;
  }

  function portfolioRequest(text) {
    const value = String(text || "").trim();
    const link = value.match(/^(?:yes[, ]+)?(?:link|connect)\s+(?:portfolio\s+)?suggestion\s+(\d+)[.!]*$/i);
    if (link) return { action: "link", index: Number(link[1]) };
    if (/^(?:yes|yes please|okay|ok)[, ]+(?:link|connect) (?:them|those projects)[.!]*$/i.test(value)) {
      return { action: "link", index: 1 };
    }
    if (/^(?:dismiss|clear|cancel)\s+(?:the\s+)?(?:portfolio\s+)?suggestions?[.!]*$/i.test(value)) {
      return { action: "clear" };
    }
    if (/\b(?:portfolio glance|project constellation|project relationships?|how (?:do )?(?:my|our|the) projects? (?:relate|connect)|synerg(?:y|ies)|dependencies between projects|consolidation opportunities|spin[- ]?off opportunities)\b/i.test(value)) {
      return { action: "glance" };
    }
    return null;
  }

  function isCommandGuideRequest(text) {
    return /^(?:help|commands?|command list|show (?:me )?(?:the )?(?:commands?|guide|glossary)|what can (?:you|aida) do|how do i use (?:you|aida)|what can i ask(?: you)?)[?.!]*$/i.test(String(text || "").trim());
  }

  function webSearchRequest(text) {
    const value = String(text || "").trim();
    if (/\b(?:our|my|the)\s+(?:logs?|memory|memories|diary|journal|drive)\b/i.test(value)) return null;
    const match = value.match(/(?:please\s+)?(?:(?:run|do|perform)\s+(?:a\s+)?web\s*search(?:\s+for)?|web\s*search:?\s*|search (?:the )?web(?: for)?|search online(?: for)?|browse (?:the )?web(?: for)?|look (?:this )?up online|research online(?: for)?|find (?:the )?(?:latest|current) (?:information )?(?:about|on))\s+(.+?)\s*$/i);
    return match?.[1] ? { query: match[1].trim() } : null;
  }

  function recentMemoryContext(limit = 3) {
    const turns = runtime()?.session?.currentTurns || [];
    return turns.slice(-limit).map((turn) => [
      turn?.user?.text || "",
      turn?.aida?.text || ""
    ].join(" ")).join(" ");
  }

  function memorySearchRequest(text) {
    const value = String(text || "").trim();
    if (!value) return null;
    const nearby = recentMemoryContext(2);
    const explicit = /\b(?:find|search|look up|meditate on|check|scan)\b.*\b(?:memory|memories|logs?|diary|journal|mentioned|said|talked about|discussed|names?)\b/i.test(value);
    const sourceTrace = /\b(?:source|sources|trace|traces|refs?|references?|where did|show me where)\b.*\b(?:memory|names?|liora|mentioned|said|talked about|discussed|that)\b/i.test(value);
    const recall = /\b(?:remind me|what were they|what did we call|what names?|which names?|favorite name|candidate names?)\b/i.test(value) &&
      /\b(?:before|earlier|previously|mentioned|said|discussed|were|was|had|onto something|names?)\b/i.test(`${value} ${nearby}`);
    if (!explicit && !recall && !sourceTrace) return null;

    const rt = runtime();
    const activeProject = rt?.context?.projectName ||
      rt?.mind?.activeProjectName ||
      rt?.context?.project?.project_name ||
      rt?.context?.project?.name ||
      rt?.mind?.activeProject?.project_name ||
      rt?.mind?.activeProject?.name ||
      "";
    const query = [value, activeProject, nearby]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 900);
    return { query, original: value, wantsTrace: sourceTrace };
  }

  function memorySearchFromRoute(route) {
    return {
      query: route.query || route.value || route.target || "",
      original: route.query || route.value || route.target || "",
      wantsTrace: route.intent === "show_sources" || route.action === "show_memory_refs"
    };
  }

  function memoryNoteRequest(text) {
    const value = String(text || "").trim();
    const match = value.match(/^(?:let'?s\s+)?(?:remember|note|make a note|save a note|mark)\s+(?:that\s+)?(.+?)\s*[.!]*$/i);
    if (!match?.[1]) return null;
    return {
      note: match[1].trim(),
      original: value
    };
  }

  async function runWebSearch(command, userText) {
    appendChat("USER", userText);
    const pending = appendChat("AIDA", "I’m checking the current web and gathering sources...");
    try {
      const result = await window.AIDA_LLM_PROVIDER?.callWebSearch?.(command.query);
      if (!result?.text) throw new Error("No sourced result returned.");
      const composed = await window.AIDA_INTENT_ROUTER?.composeToolReply?.({
        originalUserText: userText,
        intent: command.intentRoute?.intent || "web_search",
        query: command.query,
        toolName: "web_search",
        toolStatus: "ok",
        toolResult: {
          text: result.text,
          searchedAt: result.searchedAt || null,
          provider: result.provider || null,
          model: result.model || null
        },
        sources: result.sources || []
      });
      const replyText = composed || result.text;
      if (pending?.remove) pending.remove();
      else setPendingText(pending, replyText);
      appendChat("AIDA", replyText, { sources: result.sources || [] });
      const rt = runtime();
      const priorTags = Array.isArray(rt.context.customTags) ? rt.context.customTags.slice() : [];
      rt.context.customTags = [...new Set([...priorTags, "external_research", "web_sourced"])];
      const sourceText = (result.sources || []).map((source) => source.url).join("\n");
      window.AIDA_SESSION_CAPTURE?.captureExchange?.(
        userText,
        `${replyText}${sourceText ? `\n\nWEB SOURCES:\n${sourceText}` : ""}`
      );
      rt.context.customTags = priorTags;
      rt.context.lastWebResearch = result;
      pulse(`Web retrieval complete with ${result.sources?.length || 0} source(s).`);
      log(`WEB RETRIEVER: provider=${result.provider}, model=${result.model}, sources=${result.sources?.length || 0}.`, "log-blue");
      return true;
    } catch (error) {
      const reply = `I could not complete that web search: ${error.message}`;
      setPendingText(pending, reply);
      if (!pending) appendChat("AIDA", reply);
      pulse("Web retrieval did not complete.");
      return false;
    }
  }

  async function runMemorySearch(command, userText, route = null) {
    if (!window.AIDA_CRAWLER?.search) return false;
    appendChat("USER", userText);
    const pending = appendChat("AIDA", "I’m searching the indexed memory for the earlier thread...");
    window.AIDA_CRAWLER.indexNow?.("explicit_memory_search");
    const result = window.AIDA_CRAWLER.search(command.query, {
      limit: 8,
      minScore: 1,
      llmScope: "current"
    });
    const hits = result.results || [];
    const fallbackReply = hits.length
      ? `I found these memory traces:\n${hits.map((item) => `- ${item.title} [${item.project || "unfiled"}]: ${item.text}${item.sourceRefs?.length ? ` (refs: ${item.sourceRefs.join(", ")})` : ""}`).join("\n")}`
      : "I searched the indexed memory I can see from this handler, but I did not find the earlier names. That probably means the raw/session memory did not save to Drive, or it was saved under a different LLM scope.";
    const composed = hits.length && !command.wantsTrace ? await window.AIDA_INTENT_ROUTER?.composeToolReply?.({
      originalUserText: userText,
      intent: route?.intent || "memory_search",
      query: command.original || command.query,
      toolName: "memory_search",
      toolStatus: "ok",
      toolResult: {
        searchedAt: result.searchedAt,
        resultCount: hits.length,
        results: hits.map((item) => ({
          title: item.title,
          text: item.text,
          project: item.project || null,
          sourceRefs: item.sourceRefs || [],
          score: item.score
        }))
      },
      sources: []
    }) : null;
    const reply = composed || fallbackReply;
    if (pending?.remove) pending.remove();
    else setPendingText(pending, reply);
    appendChat("AIDA", reply);
    window.AIDA_SESSION_CAPTURE?.captureExchange?.(userText, reply);
    pulse(`Memory search complete with ${hits.length} match(es).`);
    log(`MEMORY SEARCH: query="${command.original || command.query}", hits=${hits.length}.`, hits.length ? "log-blue" : "log-amber");
    return true;
  }

  function runMemoryNote(command, userText) {
    const rt = runtime();
    appendChat("USER", userText);
    const projectName = rt?.context?.project?.project_name ||
      rt?.context?.project?.name ||
      rt?.mind?.activeProject?.project_name ||
      rt?.mind?.activeProject?.name ||
      "this thread";
    const reply = `I’m making a note of that for ${projectName}: ${command.note}`;
    const priorTags = Array.isArray(rt.context.customTags) ? rt.context.customTags.slice() : [];
    rt.context.customTags = [...new Set([...priorTags, "MEMORY", "NOTE"])];
    appendChat("AIDA", reply);
    window.AIDA_SESSION_CAPTURE?.captureExchange?.(userText, reply);
    rt.context.customTags = priorTags;
    pulse("Memory note captured for sleep.");
    log(`MEMORY NOTE: captured "${command.note.slice(0, 120)}".`, "log-blue");
    return true;
  }

  async function runIntentRoute(userText) {
    if (!window.AIDA_INTENT_ROUTER?.infer) return null;
    const route = await window.AIDA_INTENT_ROUTER.infer(userText);
    if (!route?.autoRun) return null;

    if (route.intent === "web_search") {
      return runWebSearch({ query: route.query, intentRoute: route }, userText);
    }

    if (route.intent === "memory_search") {
      return runMemorySearch(memorySearchFromRoute(route), userText, route);
    }

    if (route.intent === "show_sources") {
      return runMemorySearch(memorySearchFromRoute(route), userText, route);
    }

    if (route.intent === "memory_note") {
      return runMemoryNote({
        note: route.value || route.query,
        original: route.value || route.query
      }, userText);
    }

    return null;
  }

  function runCommandGuide(userText) {
    const reply = [
      "Here is my current conversation guide. Natural wording is fine; these are examples, not passwords.",
      "",
      "Memory and review",
      "- “Give me a fresh glance.” — surface a few recent memory threads.",
      "- “Show me the sources for that glance.” — show supporting references.",
      "- “Review what we have.” — map visible projects and recent memory.",
      "- “Summarize Bard and the Frozen Guide.” — review one project.",
      "- “Search our logs for Liora.” — search indexed memory.",
      "",
      "Projects",
      "- “List my projects.” / “Open project …” / “Open realm RPG.”",
      "- “Move project … into realm RPG.”",
      "- “Compare the two … project versions.”",
      "- “Yes, merge them.” / “Cancel merge.”",
      "",
      "Portfolio",
      "- “Give me a portfolio glance.” — find synergies, dependencies, overlaps, conflicts, and spin-off candidates.",
      "- “Link suggestion 1.” — stage reciprocal project links for Commit.",
      "- “Clear portfolio suggestions.”",
      "",
      "Privacy lanes",
      "- Memory stays inside the current LLM lane plus shared core memory.",
      "- “Meditate across all LLMs …” grants one-use cross-lane retrieval, then reseals.",
      "",
      "Persistence",
      "- Sleep prepares memory updates.",
      "- Commit writes staged updates to Drive.",
      "",
      "Current web research",
      "- “Search the web for …” / “Look this up online …” — explicit current research with clickable sources.",
      "- Web research is on-demand; I do not pretend to browse while you are away.",
      "",
      "You can always ask “What can you do?” to see this guide again."
    ].join("\n");
    appendChat("USER", userText);
    appendChat("AIDA", reply);
    window.AIDA_SESSION_CAPTURE?.captureExchange?.(userText, reply);
    pulse("Aida showed the conversation guide.");
    return true;
  }

  function navigationCommand(text) {
    const value = String(text || "").trim();
    if (/^(?:list|show)\s+(?:my\s+)?(?:stories|projects|realms)\??$/i.test(value)) {
      return { action: "list" };
    }
    const realm = value.match(/^(?:open|switch to)\s+realm\s+(.+?)\s*$/i);
    if (realm) return { action: "open", kind: "realm", name: realm[1] };
    const project = value.match(/^(?:open|switch to|continue)\s+(?:project|story)\s+(.+?)\s*$/i);
    if (project) return { action: "open", kind: "project", name: project[1] };
    const claim = value.match(/^(?:claim|move|file)\s+(?:project\s+|story\s+)?(.+?)\s+(?:under|into|to)\s+(?:realm\s+)?(.+?)\s*$/i);
    if (claim) return { action: "claim", projectName: claim[1], realmName: claim[2] };
    return null;
  }

  function asksForLlmIdentity(text) {
    const value = String(text || "").toLowerCase();
    const asksAboutHistory = /\b(remember|recall|memory|before|earlier|previous|last time|when we|used to)\b/.test(value);
    const explicitlyCurrent = /\b(current|currently|right now|today|this session|working on now)\b/.test(value);
    if (asksAboutHistory && !explicitlyCurrent) return false;

    const directPatterns = [
      /\b(?:what|which)\s+(?:llm|language model|model|provider|engine)\b.*\b(?:using|running|on|active|current)\b/,
      /\b(?:what|which)\b.*\b(?:llm|language model|model|provider|engine)\b.*\b(?:right now|currently|today|this session)\b/,
      /\b(?:what|which)\s+(?:llm|language model|model|provider|engine)\s+(?:are|is|do)\s+(?:we|you)\b/,
      /\b(?:are|is)\s+(?:we|you)\s+(?:using|running on|powered by)\s+(?:open\s*ai|openai|grok|xai|ollama|llama)\b/,
      /\bis it\s+(?:open\s*ai|openai|grok|xai|ollama|llama|something else)\b/,
      /\bwho\s+(?:is powering|powers|hosts)\s+(?:you|aida)\b/
    ];
    return directPatterns.some((pattern) => pattern.test(value));
  }

  function llmIdentityReply() {
    const info = window.AIDA_LLM_PROVIDER?.currentInfo?.();
    if (!info) return "I’m Aida, but my current underlying LLM route is not available yet.";

    const locality = info.local ? "running locally on this computer" : "through its hosted API";
    return `I’m Aida—the identity and memory system. Right now my underlying voice engine is ${info.providerLabel}, using ${info.model}, ${locality}.`;
  }

  function runLocalReply(userText, reply) {
    appendChat("USER", userText);
    appendChat("AIDA", reply);
    if (window.AIDA_SESSION_CAPTURE?.captureExchange) {
      window.AIDA_SESSION_CAPTURE.captureExchange(userText, reply);
    }
    pulse("Aida reported the active LLM route from runtime.");
    log("LLM IDENTITY: Reported provider/model from runtime without an API call.", "log-blue");
    return true;
  }

  function runProjectCommand(command, visibleUserText) {
    if (!window.AIDA_PROJECTS?.createDraft) return null;
    const result = window.AIDA_PROJECTS.createDraft(command.name, {
      realm: command.realm || undefined
    });
    const projectName = result.project?.project_name || result.project?.name || command.name;
    const adoptable = window.AIDA_PROJECTS?.recentAdoptableHistory?.({ limit: 12 }) || [];
    const reply = result.created
      ? adoptable.length
        ? `New project opened: ${projectName}. I found ${adoptable.length} earlier same-LLM RPG turn(s) that may belong to it. Say #adopthistory to attach them with source references, or begin fresh.`
        : `New project opened: ${projectName}. I have placed it inside the current realm as a private-candidate draft. Tell me how this story begins, and Sleep can prepare its Drive briefcase.`
      : `Project opened: ${projectName}. We can continue where it left off.`;

    appendChat("USER", visibleUserText);
    appendChat("AIDA", reply);
    window.AIDA_BODY_PROJECTS?.render?.();
    if (window.AIDA_SESSION_CAPTURE?.captureExchange) {
      window.AIDA_SESSION_CAPTURE.captureExchange(visibleUserText, reply);
    }
    pulse(`${result.created ? "Created" : "Opened"} project ${projectName}.`);
    log(`PROJECT COMMAND: ${result.created ? "created" : "opened"} ${result.fileName}.`, "log-blue");
    return result;
  }

  async function runAdoptHistoryCommand(visibleUserText) {
    await window.AIDA_LIBRARIAN?.prepareArchive?.("project_history_adoption");
    const result = window.AIDA_PROJECTS?.adoptHistory?.();
    let reply;
    if (!result?.ok) {
      reply = result?.reason === "named_project_required"
        ? "Open or create a named project first, then use #adopthistory."
        : `I found no recent RPG history from the current LLM to attach. The other LLMs remain sealed.`;
    } else if (result.alreadyAdopted) {
      reply = `${result.projectName} already contains the available ${result.provider} history.`;
    } else {
      const hint = result.hint ? ` The opening themes look like: ${result.hint}.` : "";
      reply = `I adopted ${result.count} ${result.provider} RPG turn(s) into ${result.projectName}, preserving source references from ${result.sourceStart} through ${result.sourceEnd}.${hint} Sleep can now make the link durable.`;
    }
    appendChat("USER", visibleUserText);
    appendChat("AIDA", reply);
    window.AIDA_SESSION_CAPTURE?.captureExchange?.(visibleUserText, reply);
    window.AIDA_BODY_PROJECTS?.render?.();
    pulse(result?.ok ? "Earlier RPG history attached to the active project." : "No adoptable history found.");
    log(`PROJECT HISTORY: ${result?.ok ? `adopted ${result.count || 0}` : result?.reason || "failed"}.`, result?.ok ? "log-blue" : "log-amber");
    return Boolean(result?.ok);
  }

  async function runNavigationCommand(command, visibleUserText) {
    let reply = "";
    if (command.action === "list") {
      const groups = window.AIDA_PROJECTS?.hierarchy?.() || [];
      reply = groups.length
        ? groups.map((realm) => {
            const stories = realm.projects?.length
              ? realm.projects.map((project) => project.name).join(", ")
              : "no named projects yet";
            return `${realm.name}: ${stories}`;
          }).join("\n")
        : "I do not have a realm or project ledger loaded yet.";
    } else if (command.action === "claim") {
      const result = await window.AIDA_PROJECTS?.claimProject?.(command.projectName, command.realmName);
      if (result?.ok) {
        reply = `Claimed ${result.projectName} under ${result.realmName}. Sleep and Commit will make that filing durable in Drive.`;
      } else if (result?.reason === "project_not_found") {
        reply = `I could not find the project "${command.projectName}". Try “list my stories” to see the current names.`;
      } else if (result?.reason === "realm_not_found") {
        reply = `I could not find the realm "${command.realmName}". Try “list my stories” to see the current realms.`;
      } else {
        reply = `I found ${command.projectName}, but its briefcase is not loaded yet. Please refresh Drive and try the claim again.`;
      }
    } else {
      const opened = await window.AIDA_PROJECTS?.openNamed?.(command.name, command.kind);
      reply = opened
        ? command.kind === "realm"
          ? `Realm opened: ${opened.entry.name}. I can consider its shared context and all projects, but no single project is active.`
          : `Project opened: ${opened.entry.name}. Its realm context is also active.`
        : `I could not find a ${command.kind} named "${command.name}". Try “list my stories” to see what is available.`;
    }
    appendChat("USER", visibleUserText);
    appendChat("AIDA", reply);
    window.AIDA_SESSION_CAPTURE?.captureExchange?.(visibleUserText, reply);
    window.AIDA_BODY_PROJECTS?.render?.();
    pulse(command.action === "list" ? "Realm and project ledger listed." : "Realm/project navigation completed.");
    return true;
  }

  async function runFreshGlance(userText) {
    await window.AIDA_LIBRARIAN?.prepareArchive?.("fresh_glance");
    const glance = window.AIDA_CRAWLER?.freshGlance?.({ limit: 3 });
    runtime().context.lastFreshGlance = glance || null;
    let reply;
    if (!glance?.threadCount) {
      reply = "I took a fresh glance, but nothing clear enough rose above the storage noise yet. We may need one more saved conversation before the pattern becomes useful.";
    } else {
      const lines = glance.threads.map((thread) => {
        if (thread.kind === "project") return `The project thread that still feels alive is ${thread.text}.`;
        if (thread.kind === "insight") return `Something I noticed beneath it is ${thread.text}.`;
        if (thread.kind === "fact") return `One detail worth keeping straight is ${thread.text}.`;
        if (thread.kind === "diary") return `The emotional shape I found was ${thread.text}.`;
        return `And one recent exchange that still has some energy is ${thread.text}.`;
      });
      reply = `I took a fresh glance through the memories available to this LLM. ${lines.join(" ")} Nothing there feels urgent—I just thought those threads were worth bringing back to the table.`;
    }
    appendChat("USER", userText);
    appendChat("AIDA", reply);
    window.AIDA_SESSION_CAPTURE?.captureExchange?.(userText, reply);
    pulse(`Fresh Glance reviewed ${glance?.threadCount || 0} memory thread(s).`);
    log(`FRESH GLANCE: provider=${glance?.provider || "unknown"}, threads=${glance?.threadCount || 0}, refs=${glance?.sourceRefCount || 0}.`, "log-blue");
    return true;
  }

  async function runMemoryOverview(userText) {
    await window.AIDA_PROJECTS?.hydrateHierarchy?.();
    await window.AIDA_LIBRARIAN?.prepareArchive?.("memory_overview");
    const overview = window.AIDA_PROJECTS?.memoryOverview?.({ limit: 8 });
    const glance = window.AIDA_CRAWLER?.freshGlance?.({ limit: 3, allProjects: true });
    const projects = overview?.projects || [];
    const projectLines = projects.length
      ? projects.map((item) => `- ${item.name} [${item.realm}]: ${item.summary}`).join("\n")
      : "- No visible projects are loaded for this LLM yet.";
    const glanceLines = glance?.threads?.length
      ? `\n\nRecent threads:\n${glance.threads.map((item) => `- ${item.text}`).join("\n")}`
      : "";
    const reply = `Here is the quick map of the memory available to this LLM: ${overview?.projectCount || 0} project(s) across ${overview?.realmCount || 0} realm(s).\n${projectLines}${glanceLines}\n\nYou can ask me to open a project, summarize one, search for a memory, or compare duplicate projects.`;
    appendChat("USER", userText);
    appendChat("AIDA", reply);
    window.AIDA_SESSION_CAPTURE?.captureExchange?.(userText, reply);
    pulse(`Memory map reviewed ${overview?.projectCount || 0} project(s).`);
    return true;
  }

  async function runProjectReconciliation(command, userText) {
    let reply;
    if (command.action === "cancel") {
      const cancelled = window.AIDA_PROJECTS?.cancelProjectReconciliation?.();
      if (!cancelled) return null;
      reply = "All right—I cancelled the pending project merge. Nothing was changed.";
    } else if (command.action === "confirm") {
      const result = window.AIDA_PROJECTS?.confirmProjectReconciliation?.();
      if (!result?.ok) {
        if (result?.reason === "no_pending_reconciliation") return null;
        reply = result?.reason === "llm_scope_mismatch"
          ? "I cannot merge those briefcases from the current LLM lane."
          : "I could not safely stage that merge because one of the briefcases is not loaded.";
      } else {
        reply = `I staged the merge locally: ${result.projectName} keeps ${result.survivorFile} as canonical, and ${result.duplicateFile} is marked superseded. Nothing is durable in Drive until Commit applies those staged writes.`;
      }
    } else {
      const comparison = await window.AIDA_PROJECTS?.compareProjects?.(command.query);
      if (!comparison?.ok) {
        reply = comparison?.candidates?.length === 1
          ? `I found only one matching project: ${comparison.candidates[0].name}. I need two loaded briefcases before I can compare or reconcile them.`
          : "I could not find two matching project briefcases in the current LLM lane. Try “list my projects” so we can use their visible names.";
      } else {
        const details = comparison.candidates.map((item) => (
          `- ${item.fileName}: realm=${item.realm}, memory items=${item.contentCount}, sources=${item.sourceRefCount}, summary=${item.summary}`
        )).join("\n");
        reply = `I found ${comparison.candidates.length} likely matching briefcases:\n${details}\n\nMy safest recommendation is to keep ${comparison.recommendedSurvivor.fileName}, merge unique memories from ${comparison.recommendedDuplicate.fileName}, and archive the duplicate rather than deleting it. Say “yes, merge them” to stage that reconciliation, or “cancel merge” to leave both untouched.`;
      }
    }
    appendChat("USER", userText);
    appendChat("AIDA", reply);
    window.AIDA_SESSION_CAPTURE?.captureExchange?.(userText, reply);
    window.AIDA_BODY_PROJECTS?.render?.();
    pulse("Project memory reconciliation reviewed.");
    return true;
  }

  async function runProjectSummary(command, userText) {
    const result = await window.AIDA_PROJECTS?.summarizeProject?.(command.query);
    const reply = !result?.ok
      ? `I could not find a visible project matching “${command.query}” in the current LLM lane. Try “list my projects” to see the loaded names.`
      : `${result.name} is filed under ${result.realm}. ${result.summary} It currently has ${result.openThreadCount} open thread(s) and ${result.sourceRefCount} direct source reference(s). Say “open project ${result.name}” to continue there.`;
    appendChat("USER", userText);
    appendChat("AIDA", reply);
    window.AIDA_SESSION_CAPTURE?.captureExchange?.(userText, reply);
    pulse(result?.ok ? `Reviewed ${result.name}.` : "Project summary not found.");
    return true;
  }

  async function runPortfolio(command, userText) {
    let reply;
    if (command.action === "clear") {
      const cleared = window.AIDA_PROJECTS?.clearPortfolioSuggestions?.();
      if (!cleared) return null;
      reply = "I cleared the portfolio suggestions. No project links were changed.";
    } else if (command.action === "link") {
      const result = window.AIDA_PROJECTS?.stageProjectRelationship?.(command.index);
      if (!result?.ok) {
        if (result?.reason === "suggestion_not_found") return null;
        reply = result?.reason === "conflict_requires_review"
          ? "That suggestion is a possible conflict, so I will not link it automatically. We should review the incompatible assumptions first."
          : result?.reason === "llm_scope_mismatch"
            ? "I cannot link those projects from the current LLM lane."
            : "I could not safely stage that relationship because one of the briefcases is not loaded.";
      } else {
        const [left, right] = result.relationship.projects;
        reply = `Linked ${left.name} and ${right.name} as ${result.relationship.type}. I added reciprocal evidence-backed references to both briefcases; Commit will make the relationship durable.`;
      }
    } else {
      const glance = await window.AIDA_PROJECTS?.portfolioGlance?.({ limit: 6 });
      if (!glance?.relationshipCount && !glance?.spinOffs?.length) {
        reply = `I reviewed ${glance?.projectCount || 0} visible project(s), but I do not yet have enough shared evidence to claim a useful relationship. I would rather leave the map sparse than invent connections.`;
      } else {
        const relationshipLines = (glance.relationships || []).map((item, index) => {
          const names = item.projects.map((project) => project.name).join(" ↔ ");
          const evidence = item.evidence.length ? ` Shared signals: ${item.evidence.join(", ")}.` : "";
          return `${index + 1}. ${item.type}: ${names} (${item.confidence}).${evidence} Recommendation: ${item.recommendation}.`;
        });
        const spinOffLines = (glance.spinOffs || []).map((item) => (
          `- spin-off candidate from ${item.project.name}: ${item.thread}`
        ));
        reply = `I took a portfolio glance across ${glance.projectCount} project(s) in this LLM lane.\n${relationshipLines.join("\n")}${spinOffLines.length ? `\n\nPossible spin-offs:\n${spinOffLines.join("\n")}` : ""}\n\nThis is a proposal map, not a restructuring. Say “link suggestion 1” to stage a reciprocal project link, or ask me to compare a consolidation candidate before merging anything.`;
      }
      runtime().context.lastPortfolioGlance = glance || null;
    }
    appendChat("USER", userText);
    appendChat("AIDA", reply);
    window.AIDA_SESSION_CAPTURE?.captureExchange?.(userText, reply);
    window.AIDA_BODY_PROJECTS?.render?.();
    pulse("Portfolio relationships reviewed.");
    return true;
  }

  function runFreshGlanceSources(userText) {
    const glance = runtime().context?.lastFreshGlance;
    const refs = [...new Set((glance?.threads || []).flatMap((thread) => thread.sourceRefs || []))];
    const reply = refs.length
      ? `Here are the memory references behind that glance:\n${refs.map((ref) => `- ${ref}`).join("\n")}`
      : "That glance came from indexed memory, but its selected threads did not carry turn-level source references.";
    appendChat("USER", userText);
    appendChat("AIDA", reply);
    window.AIDA_SESSION_CAPTURE?.captureExchange?.(userText, reply);
    pulse(`Fresh Glance sources: ${refs.length}.`);
    return true;
  }

  async function runReturnContextChoice(userText) {
    const proposed = runtime().context?.proposedReturnContext;
    if (!proposed?.projectKey) return null;
    const value = String(userText || "").trim();
    const accepts = /^(?:yes|yes please|sure|okay|ok|let'?s|let us)\b.*(?:return|continue|go back|there)?[.!]*$/i.test(value) ||
      /^(?:return|continue|go back)(?:\s+there)?[.!]*$/i.test(value);
    if (!accepts) {
      window.AIDA_PROJECTS?.dismissReturnContext?.();
      return null;
    }

    const result = await window.AIDA_PROJECTS?.acceptReturnContext?.();
    if (!result) return null;
    const reply = `Lovely. We are back in ${result.projectName}${result.realmName ? ` within ${result.realmName}` : ""}.`;
    appendChat("USER", userText);
    appendChat("AIDA", reply);
    window.AIDA_SESSION_CAPTURE?.captureExchange?.(userText, reply);
    window.AIDA_BODY_PROJECTS?.render?.();
    pulse(`Returned to ${result.projectName}.`);
    log(`PROJECT RETURN: reopened ${result.projectName}.`, "log-blue");
    return true;
  }

  function runPendingStoryTitle(userText) {
    const result = window.AIDA_PROJECTS?.consumeUnnamedStoryTitle?.(userText);
    if (!result?.handled) return null;
    const adopted = result.adopted;
    const reply = adopted?.ok
      ? `I created ${result.title} and adopted ${adopted.count} ${adopted.provider} RPG turn(s) as its opening brainstorm, with source references preserved. Sleep can now make it durable.`
      : `I created ${result.title}. I did not find same-LLM history to adopt, so we will begin fresh.`;
    appendChat("USER", userText);
    appendChat("AIDA", reply);
    window.AIDA_SESSION_CAPTURE?.captureExchange?.(userText, reply);
    window.AIDA_BODY_PROJECTS?.render?.();
    pulse(`Created ${result.title} from the unnamed story thread.`);
    log(`PROJECT NAMING: created ${result.title}, adopted=${adopted?.count || 0}.`, "log-blue");
    return true;
  }

  function offerUnnamedStorySuggestion() {
    const suggestion = window.AIDA_PROJECTS?.suggestUnnamedStory?.();
    if (!suggestion?.text) return null;
    appendChat("AIDA", suggestion.text);
    pulse("Aida noticed an unnamed story thread.");
    log(`PROJECT SUGGESTION: ${suggestion.count} ${suggestion.provider} RPG turn(s), hint=${suggestion.hint}.`, "log-blue");
    return suggestion;
  }

  function gate() {
    const rt = runtime();
    const missing = [];

    if (!rt?.boot?.driveLoaded) missing.push("Drive JSON fetch");
    if (!rt?.boot?.airlockCleared) missing.push("airlock");
    const providerReady = window.AIDA_LLM_PROVIDER?.readiness?.();
    if (!window.AIDA_LLM_PROVIDER?.callMessages) missing.push("LLM provider dispatcher");
    if (providerReady && !providerReady.pass) missing.push(...providerReady.missing);
    if (!window.AIDA_LLM_MESSAGES?.build) missing.push("LLM message builder");

    return {
      pass: missing.length === 0,
      missing
    };
  }

  async function sendText(userText, options = {}) {
    const attachment = options.attachment || window.AIDA_GLASSES?.peek?.() || null;
    const text = (userText || "").trim() || (
      attachment
        ? "Please examine the attached file and tell me what you notice."
        : ""
    );
    if (!text) return false;

    const rt = runtime();
    const meditationScope = meditationScopeRequest(text);
    if (meditationScope === "all") {
      window.AIDA_LLM_SCOPE?.authorizeOnce?.("all", "explicit_cross_llm_meditation");
      log("MEMORY SCOPE: one-use all-LLM meditation authorized by explicit user request.", "log-amber");
    } else if (meditationScope === "current") {
      window.AIDA_LLM_SCOPE?.clearAccess?.();
    }
    const returnChoice = await runReturnContextChoice(text);
    if (returnChoice) return returnChoice;
    if (isCommandGuideRequest(text)) return runCommandGuide(text);
    const intentRoute = await runIntentRoute(text);
    if (intentRoute) return intentRoute;
    const memoryNote = memoryNoteRequest(text);
    if (memoryNote) return runMemoryNote(memoryNote, text);
    const directMemorySearch = memorySearchRequest(text);
    if (directMemorySearch) return runMemorySearch(directMemorySearch, text);
    const webSearch = webSearchRequest(text);
    if (webSearch) return runWebSearch(webSearch, text);
    const reconciliation = projectReconciliationRequest(text);
    if (reconciliation) {
      const handled = await runProjectReconciliation(reconciliation, text);
      if (handled) return handled;
    }
    const portfolio = portfolioRequest(text);
    if (portfolio) {
      const handled = await runPortfolio(portfolio, text);
      if (handled) return handled;
    }
    if (isMemoryOverviewRequest(text)) return runMemoryOverview(text);
    const projectSummary = projectSummaryRequest(text);
    if (projectSummary) return runProjectSummary(projectSummary, text);
    if (isFreshGlanceSourcesRequest(text)) return runFreshGlanceSources(text);
    if (isFreshGlanceRequest(text)) return runFreshGlance(text);
    const navigation = navigationCommand(text);
    if (navigation) return runNavigationCommand(navigation, text);
    if (isAdoptHistoryCommand(text)) {
      return runAdoptHistoryCommand(text);
    }
    if (asksForLlmIdentity(text)) {
      return runLocalReply(text, llmIdentityReply());
    }
    const command = projectCommand(text);
    if (command) {
      try {
        return Boolean(runProjectCommand(command, text));
      } catch (error) {
        appendChat("AIDA", `I could not create that project: ${error.message}`);
        log(`PROJECT COMMAND: ${error.message}`, "log-amber");
        return false;
      }
    }

    const ready = gate();
    if (!ready.pass) {
      log(`LLM SEND: WAIT. Missing ${ready.missing.join(", ")}.`, "log-amber");
      pulse(`LLM send blocked: missing ${ready.missing.join(", ")}.`);
      return false;
    }

    if (window.AIDA_LLM_MESSAGES?.needsArchive?.(text)) {
      pulse("Aida is opening the relevant memory shelves.");
      await window.AIDA_LIBRARIAN?.prepareArchive?.("conversation_memory_request");
    }

    const built = window.AIDA_LLM_MESSAGES?.build?.(text, { attachment });
    if (!built || built.blocked || !Array.isArray(rt.context.llmMessages)) {
      window.AIDA_LLM_SCOPE?.clearAccess?.();
      const missing = built?.missing?.join(", ") || "message packet";
      log(`LLM SEND: WAIT. Missing ${missing}.`, "log-amber");
      return false;
    }

    const visibleUserText = attachment ? `${text}\n[Attached: ${attachment.name}]` : text;
    appendChat("USER", visibleUserText);
    const pending = appendChat("AIDA", "...");
    pulse("LLM request sent. Awaiting Aida response.");
    log(
      `LLM SEND: provider=${rt.tokens.llm.provider || "unknown"}, profile=${rt.tokens.llm.profile || "unknown"}, messages=${rt.context.llmMessages.length}.`,
      "log-blue"
    );

    try {
      rt.boot.phase = "llm_request";
      const reply = await window.AIDA_LLM_PROVIDER.callMessages(rt.context.llmMessages);
      window.AIDA_LLM_SCOPE?.consumeAccess?.();
      const directed = window.AIDA_DIRECTOR?.present?.(reply, pending) || null;
      if (!directed) {
        setPendingText(pending, reply);
        if (!pending) appendChat("AIDA", reply);
      }
      const transcript = directed?.transcript || reply;
      if (window.AIDA_EMOTIONS?.afterExchange) {
        window.AIDA_EMOTIONS.afterExchange(text, transcript);
      }
      if (window.AIDA_SESSION_CAPTURE?.captureExchange) {
        window.AIDA_SESSION_CAPTURE.captureExchange(visibleUserText, transcript);
      }
      offerUnnamedStorySuggestion();
      if (attachment) window.AIDA_GLASSES?.markSent?.();
      rt.boot.phase = "llm_response_received";
      pulse("Aida response received. Memory write is still disabled.");
      log("LLM SEND: Response received. No memory write performed.", "log-blue");
      return true;
    } catch (error) {
      window.AIDA_LLM_SCOPE?.clearAccess?.();
      setPendingText(pending, `LLM call failed: ${error.message}`);
      rt.boot.phase = "llm_request_failed";
      pulse(`LLM call failed: ${error.message}`);
      log(`LLM SEND: ${error.message}`, "log-amber");
      return false;
    }
  }

  async function sendFromInput() {
    const input = $("user-in");
    const send = $("send-btn");
    const text = input?.value.trim() || "";
    const attachment = window.AIDA_GLASSES?.peek?.() || null;
    if (!text && !attachment) return false;

    if (send) send.disabled = true;
    try {
      const sent = await sendText(text, { attachment });
      if (sent && input) {
        input.value = "";
        try {
          localStorage.removeItem("AIDA_INPUT_DRAFT_V1");
        } catch (_) {
          // Draft persistence is a convenience; sending must not depend on storage.
        }
      }
      return sent;
    } finally {
      if (send) send.disabled = false;
      if (input) input.focus();
    }
  }

  function install() {
    window.AIDA_CONVERSATION = {
      sendText,
      sendFromInput,
      gate,
      isLlmIdentityQuestion: asksForLlmIdentity
    };
    window.AIDA_LLM = {
      callMessages: window.AIDA_LLM_PROVIDER.callMessages,
      extractOutputText: window.AIDA_LLM_PROVIDER.extractOutputText,
      gate
    };
    window.AIDA_OPENAI = window.AIDA_LLM;
    log("Multi-provider conversation organ loaded. Live send is gated.", "log-blue");
  }

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "conversation_loop",
      reads: ["AIDA_RUNTIME.context.llmMessages", "AIDA_RUNTIME.tokens.llm.key"],
      writes: ["AIDA_RUNTIME.context.lastLlmResponse", "AIDA_RUNTIME.boot.phase"],
      requires: ["AIDA_RUNTIME", "AIDA_LLM_MESSAGES", "AIDA_SESSION_CAPTURE"],
      verifies: ["live LLM call is refused unless Drive, airlock, provider credentials, and messages are ready; a provider-neutral call is exposed for gated spine jobs"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
