(function () {
  const MODULE_ID = "spine.llm.openai";
  const RESPONSES_URL = "https://api.openai.com/v1/responses";

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

  function gate() {
    const rt = runtime();
    const missing = [];

    if (!rt?.boot?.driveLoaded) missing.push("Drive JSON fetch");
    if (!rt?.boot?.airlockCleared) missing.push("airlock");
    if (!rt?.tokens?.llm?.key) missing.push("LLM key");
    if (rt?.tokens?.llm?.provider !== "openai") missing.push("OpenAI route");
    if (!window.AIDA_LLM_MESSAGES?.build) missing.push("LLM message builder");

    return {
      pass: missing.length === 0,
      missing
    };
  }

  function extractOutputText(data) {
    if (typeof data?.output_text === "string" && data.output_text.trim()) {
      return data.output_text.trim();
    }

    const chunks = [];
    for (const item of data?.output || []) {
      for (const content of item.content || []) {
        if (typeof content.text === "string") chunks.push(content.text);
      }
    }

    return chunks.join("\n").trim();
  }

  async function callOpenAI(messages, options = {}) {
    const rt = runtime();
    const model = options.model || config().llm?.model || "gpt-4.1-mini";
    const maxOutputTokens = options.maxOutputTokens || config().llm?.maxOutputTokens || 700;
    const extraBody = options.body && typeof options.body === "object" ? options.body : {};

    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${rt.tokens.llm.key}`
      },
      body: JSON.stringify({
        model,
        input: messages,
        max_output_tokens: maxOutputTokens,
        ...extraBody
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = data?.error?.message || `HTTP ${response.status}`;
      throw new Error(detail);
    }

    const text = extractOutputText(data);
    if (!text) throw new Error("OpenAI response did not contain text output.");

    rt.context.lastLlmResponse = {
      provider: "openai",
      model,
      responseId: data.id || null,
      createdAt: new Date().toISOString()
    };

    return text;
  }

  async function sendText(userText) {
    const text = (userText || "").trim();
    if (!text) return false;

    const rt = runtime();
    const ready = gate();
    if (!ready.pass) {
      log(`LLM SEND: WAIT. Missing ${ready.missing.join(", ")}.`, "log-amber");
      pulse(`LLM send blocked: missing ${ready.missing.join(", ")}.`);
      return false;
    }

    const built = window.AIDA_LLM_MESSAGES?.build?.(text);
    if (!built || built.blocked || !Array.isArray(rt.context.llmMessages)) {
      const missing = built?.missing?.join(", ") || "message packet";
      log(`LLM SEND: WAIT. Missing ${missing}.`, "log-amber");
      return false;
    }

    appendChat("USER", text);
    const pending = appendChat("AIDA", "...");
    pulse("LLM request sent. Awaiting Aida response.");
    log(
      `LLM SEND: provider=openai, profile=${rt.tokens.llm.profile || "unknown"}, messages=${rt.context.llmMessages.length}.`,
      "log-blue"
    );

    try {
      rt.boot.phase = "llm_request";
      const reply = await callOpenAI(rt.context.llmMessages);
      if (pending) pending.textContent = reply;
      else appendChat("AIDA", reply);
      if (window.AIDA_EMOTIONS?.afterExchange) {
        window.AIDA_EMOTIONS.afterExchange(text, reply);
      }
      if (window.AIDA_SESSION_CAPTURE?.captureExchange) {
        window.AIDA_SESSION_CAPTURE.captureExchange(text, reply);
      }
      rt.boot.phase = "llm_response_received";
      pulse("Aida response received. Memory write is still disabled.");
      log("LLM SEND: Response received. No memory write performed.", "log-blue");
      return true;
    } catch (error) {
      if (pending) pending.textContent = `LLM call failed: ${error.message}`;
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
    if (!text) return false;

    if (input) input.value = "";
    if (send) send.disabled = true;
    try {
      return await sendText(text);
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
    window.AIDA_OPENAI = {
      callMessages: callOpenAI,
      extractOutputText,
      gate
    };
    log("OpenAI conversation organ loaded. Live send is gated.", "log-blue");
  }

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "conversation_loop",
      reads: ["AIDA_RUNTIME.context.llmMessages", "AIDA_RUNTIME.tokens.llm.key"],
      writes: ["AIDA_RUNTIME.context.lastLlmResponse", "AIDA_RUNTIME.boot.phase"],
      requires: ["AIDA_RUNTIME", "AIDA_LLM_MESSAGES", "AIDA_SESSION_CAPTURE"],
      verifies: ["live LLM call is refused unless Drive, airlock, key, and messages are ready; generic OpenAI calls are exposed for gated spine jobs"]
    });
  }

  document.addEventListener("DOMContentLoaded", install);
})();
