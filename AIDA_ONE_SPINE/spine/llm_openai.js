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

  function runProjectCommand(command, visibleUserText) {
    if (!window.AIDA_PROJECTS?.createDraft) return null;
    const result = window.AIDA_PROJECTS.createDraft(command.name, {
      realm: command.realm || undefined
    });
    const projectName = result.project?.project_name || result.project?.name || command.name;
    const reply = result.created
      ? `New project opened: ${projectName}. I have placed it inside the current realm as a private-candidate draft. Tell me how this story begins, and Sleep can prepare its Drive briefcase.`
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
      if (attachment) window.AIDA_GLASSES?.markSent?.();
      rt.boot.phase = "llm_response_received";
      pulse("Aida response received. Memory write is still disabled.");
      log("LLM SEND: Response received. No memory write performed.", "log-blue");
      return true;
    } catch (error) {
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
      gate
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
