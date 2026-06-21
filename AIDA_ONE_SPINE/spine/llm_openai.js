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

  function appendChat(role, text) {
    if (window.AIDA_BODY?.appendChat) {
      return window.AIDA_BODY.appendChat(role, text);
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
    const match = String(text || "").match(/^\s*#(?:newproject|new-project|project)\s+(.+?)\s*$/i);
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
    if (isFreshGlanceSourcesRequest(text)) return runFreshGlanceSources(text);
    if (isFreshGlanceRequest(text)) return runFreshGlance(text);
    const navigation = navigationCommand(text);
    if (navigation) return runNavigationCommand(navigation, text);
    const namedStory = runPendingStoryTitle(text);
    if (namedStory) return namedStory;
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
