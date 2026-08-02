// AIDA REVIEW BLOCK 1: File header - AIDA_ONE_SPINE\spine\llm_openai.js
// Simplified conversation organ: thin LLM send loop, no command routing.
// Inputs: llm_provider, llm_messages, project_context, sleep_cycle
// Outputs: final reply, distillation packets (via downstream organs)

(function () {
  const MODULE_ID = "spine.llm.conversation";

  // AIDA REVIEW BLOCK 2: Helpers
  function $(id) {
    return document.getElementById(id);
  }

  function runtime() {
    return window.AIDA_RUNTIME;
  }

function log(message, className = "log-blue") {
    if (window.AIDA_BIOS?.log) {
        window.AIDA_BIOS.log(message, className);
        return;
    }
    if (window.AIDA_BODY?.pulse) {
        window.AIDA_BODY.pulse(message);
    }
}

const rt = runtime();
rt.context = rt.context || {};
rt.mind = rt.mind || {};
rt.session = rt.session || {};
rt.drive = rt.drive || {};
rt.boot = rt.boot || {};

log(`ORGAN LOAD: ${MODULE_ID}`, "log-white");

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

  // AIDA REVIEW BLOCK 3: LLM identity question (kept for diagnostics)
  function asksForLlmIdentity(text) {
    const value = String(text || "").toLowerCase();
    const directPatterns = [
      /\b(?:what|which)\s+(?:llm|language model|model|provider|engine)\b.*\b(?:using|running|on|active|current)\b/,
      /\b(?:are|is)\s+(?:we|you)\s+(?:using|running on|powered by)\s+(?:open\s*ai|openai|grok|xai|ollama|llama)\b/,
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

  function requestedCrossLlmConsultation(text) {
    const value = String(text || "").toLowerCase();
    return /\b(?:consult|use|open|search|remember)\b[^.?!]{0,60}\b(?:all\s+(?:llm\s+)?(?:memory|lanes)|cross[-\s]?llm|other\s+(?:model|llm)\s+(?:memory|lane))\b/.test(value) ||
      /\b(?:grant|allow)\b[^.?!]{0,60}\bcross[-\s]?llm\b/.test(value);
  }

  function runLocalReply(userText, reply) {
    appendChat("USER", userText);
    appendChat("AIDA", reply);
    window.AIDA_SESSION_CAPTURE?.captureExchange?.(userText, reply);
    pulse("Aida reported the active LLM route from runtime.");
    log("LLM IDENTITY: Reported provider/model from runtime without an API call.", "log-blue");
    return true;
  }

  async function runProjectIntent(userText) {
    const route = await window.AIDA_INTENT_ROUTER?.infer?.(userText);
    if (!route || !["project_create", "project_update"].includes(route.intent)) return false;
    const proposal = window.AIDA_ACTION_EXECUTOR?.propose?.(route);
    if (!proposal) return false;
    appendChat("USER", userText);
    appendChat("AIDA", proposal.reply);
    window.AIDA_SESSION_CAPTURE?.captureExchange?.(userText, proposal.reply);
    pulse(proposal.ok ? "Project action awaiting confirmation." : "Project action needs clarification.");
    log(`PROJECT ACTION: ${proposal.ok ? "proposed" : "needs clarification"} ${route.action || route.intent}.`, proposal.ok ? "log-blue" : "log-amber");
    return true;
  }

  async function runPendingActionConfirmation(userText) {
    const result = await window.AIDA_ACTION_EXECUTOR?.confirm?.(userText);
    if (!result) return false;
    appendChat("USER", userText);
    appendChat("AIDA", result.reply);
    window.AIDA_SESSION_CAPTURE?.captureExchange?.(userText, result.reply);
    pulse(result.ok ? "Project action staged for Drive writeback." : "Project action was not completed.");
    log(`PROJECT ACTION: ${result.ok ? "executed" : "rejected"}.`, result.ok ? "log-blue" : "log-amber");
    return true;
  }

  // AIDA REVIEW BLOCK 4: Gate — ensure spine and provider are ready
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

  // AIDA REVIEW BLOCK 5: Core send loop — single, persona‑aware LLM call
  async function sendText(userText, options = {}) {
    const attachment = options.attachment || window.AIDA_GLASSES?.peek?.() || null;
    const text = (userText || "").trim() || (
      attachment
        ? "Please examine the attached file and tell me what you notice."
        : ""
    );
    if (!text) return false;

    const rt = runtime();

    // Optional: identity question handled locally, no LLM call.
    if (asksForLlmIdentity(text)) {
      return runLocalReply(text, llmIdentityReply());
    }

    if (await runPendingActionConfirmation(text)) return true;
    if (await runProjectIntent(text)) return true;

    const ready = gate();
    if (!ready.pass) {
      log(`LLM SEND: WAIT. Missing ${ready.missing.join(", ")}.`, "log-amber");
      pulse(`LLM send blocked: missing ${ready.missing.join(", ")}.`);
      return false;
    }

    if (requestedCrossLlmConsultation(text)) {
      window.AIDA_LLM_SCOPE?.authorizeOnce?.("all", "explicit_user_cross_llm_consultation");
      const sealedProject = rt.context?.sealedProject;
      if (sealedProject?.loadName || sealedProject?.requested) {
        window.AIDA_PROJECTS?.select?.(sealedProject.loadName || sealedProject.requested);
      }
      log("LLM MEMORY: One-turn cross-LLM consultation authorized.", "log-amber");
    }

    // Prepare memory shelves if needed.
    if (window.AIDA_LLM_MESSAGES?.needsArchive?.(text)) {
      pulse("Aida is opening the relevant memory shelves.");
      await window.AIDA_LIBRARIAN?.prepareArchive?.("conversation_memory_request");
    }

    const built = window.AIDA_LLM_MESSAGES?.build?.(text, { attachment });
    if (!built || built.blocked || !Array.isArray(rt.context.llmMessages)) {
      window.AIDA_LLM_SCOPE?.clearAccess?.();
      const missing = built?.missing?.join?.(", ") || "message packet";
      log(`LLM SEND: WAIT. Missing ${missing}.`, "log-amber");
      return false;
    }

    const visibleUserText = attachment
      ? `${text}\n[Attached: ${attachment.name}]`
      : text;

    appendChat("USER", visibleUserText);
    const pending = appendChat("AIDA", "…");
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
      if (attachment) window.AIDA_GLASSES?.markSent?.();

      // Emotional continuity and distillation hooks.
      window.AIDA_EMOTIONS?.afterExchange?.(text, transcript);
      window.AIDA_SESSION_CAPTURE?.captureExchange?.(visibleUserText, transcript);
      window.AIDA_SLEEP_CYCLE?.afterExchange?.(text, transcript);

      rt.context.lastLlmResponse = {
        text: transcript,
        raw: reply
      };

      pulse("Conversation exchange completed.");
      log("LLM SEND: reply received and staged.", "log-blue");
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

  // AIDA REVIEW BLOCK 6: sendFromInput — UI wiring
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
          // Draft persistence is convenience only.
        }
      }
      return sent;
    } finally {
      if (send) send.disabled = false;
      if (input) input.focus();
    }
  }

  // AIDA REVIEW BLOCK 7: install — browser exports and module registration
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

    if (window.AIDA_MODULES) {
      window.AIDA_MODULES.register({
        id: MODULE_ID,
        phase: "conversation_loop",
        reads: [
          "AIDA_RUNTIME.context.llmMessages",
          "AIDA_RUNTIME.tokens.llm.key"
        ],
        writes: [
          "AIDA_RUNTIME.context.lastLlmResponse",
          "AIDA_RUNTIME.boot.phase"
        ],
        requires: [
          "AIDA_RUNTIME",
          "AIDA_LLM_MESSAGES",
          "AIDA_SESSION_CAPTURE"
        ],
        verifies: [
          "live LLM call is refused unless Drive, airlock, provider credentials, and messages are ready; a provider-neutral call is exposed for gated spine jobs"
        ]
      });
    }
  }

  // AIDA REVIEW BLOCK 8: DOM wiring
  document.addEventListener("DOMContentLoaded", install);
})();
