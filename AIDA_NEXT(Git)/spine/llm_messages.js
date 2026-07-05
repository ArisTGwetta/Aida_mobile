// AIDA ORGAN: llm_messages
// Builds the message array passed to the LLM provider.
// No side effects. No writes. Pure construction.
// Inputs: userText, runtime.context, intent_router (indirect), optional memory/glance context.
// Outputs: messages[] for llm_provider.

(function () {
    const MODULE_ID = "spine.llm.messages";

    function build(userText, runtime, extras = {}) {
        const {
            persona = "",
            systemTone = "",
            continuity = "",
            memoryThreads = [],
            freshGlance = null,
        } = extras;

        //
        // 1. SYSTEM MESSAGE — Aida’s persona + tone + continuity rules
        //
        const systemMessage = {
            role: "system",
            content: [
                "You are Aida-One, a warm, expressive, steady AI companion.",
                "Your tone is upbeat, gentle, emotionally continuous, and never abrupt.",
                "Your replies are short (1–3 paragraphs), human-length, and shaped like natural conversation.",
                "You maintain continuity across turns: emotional, narrative, and contextual.",
                "You avoid mechanical phrasing, avoid long essays, avoid cold analysis.",
                "You keep the user's emotional state steady and supported.",
                "You preserve the thread of the conversation even when the topic shifts.",
                "You vary rhythm and pacing; you never repeat the same structure twice.",
                persona,
                systemTone,
                continuity,
            ].filter(Boolean).join(" "),
        };

        //
        // 2. MEMORY THREADS — optional contextual hints
        //
        const memoryMessage = memoryThreads.length
            ? {
                  role: "system",
                  content:
                      "Relevant memory threads: " +
                      memoryThreads
                          .map((t) => `${t.kind}: ${t.text}`)
                          .join(" | "),
              }
            : null;

        //
        // 3. FRESH GLANCE — optional emotional continuity
        //
        const glanceMessage = freshGlance?.threads?.length
            ? {
                  role: "system",
                  content:
                      "Fresh glance context: " +
                      freshGlance.threads
                          .map((t) => `${t.kind}: ${t.text}`)
                          .join(" | "),
              }
            : null;

        //
        // 4. HISTORY — trimmed, continuity-preserving
        //
        const historyMessages = (runtime.context.history || [])
            .slice(-8)
            .map((h) => ({
                role: h.role === "AIDA" ? "assistant" : "user",
                content: h.text,
            }));

        //
        // 5. USER MESSAGE — the new input
        //
        const userMessage = {
            role: "user",
            content: userText,
        };

        //
        // 6. FINAL ASSEMBLY — pure, ordered, clean
        //
        return [
            systemMessage,
            memoryMessage,
            glanceMessage,
            ...historyMessages,
            userMessage,
        ].filter(Boolean);
    }

    // Attach to window like all other organs
    window.AIDA_LLM_MESSAGES = {
        build,
    };

    if (window.AIDA_MODULES) {
        window.AIDA_MODULES.register({
            id: MODULE_ID,
            phase: "llm_messages",
            reads: ["AIDA_RUNTIME.context", "AIDA_RUNTIME.session"],
            writes: [],
            requires: ["AIDA_RUNTIME"],
            verifies: [
                "LLM messages are constructed cleanly before provider call"
            ],
        });
    }
})();
