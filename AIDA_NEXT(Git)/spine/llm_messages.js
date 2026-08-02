// AIDA ORGAN: llm_messages
// Builds the message array passed to the LLM provider.
// No side effects. No writes. Pure construction.
// Inputs: userText, runtime.context, intent_router (indirect), optional memory/glance context.
// Outputs: messages[] for llm_provider.

(function () {
    const MODULE_ID = "spine.llm.messages";

    function scopeInfo() {
        return window.AIDA_LLM_SCOPE?.current?.() || {
            provider: null,
            profile: null,
            model: null,
            scope: "shared",
        };
    }

    function retrievalMode() {
        return window.AIDA_LLM_SCOPE?.retrievalMode?.() || "current";
    }

    function objectLane(value) {
        if (!value || typeof value !== "object") return null;
        return (
            value.llm_scope ||
            value.llmScope ||
            value.llm_provider ||
            value.llmProvider ||
            value.tags?.llm_scope ||
            value.tags?.llm_provider ||
            null
        );
    }

    function allowsLane(value, options = {}) {
        if (!value || typeof value !== "object") return true;
        if (retrievalMode() === "all") return true;
        return window.AIDA_LLM_SCOPE?.allows?.(value, {
            provider: scopeInfo().provider,
            fallback: options.fallback || "shared",
        }) ?? true;
    }

    function sanitizeForLane(value, options = {}) {
        const blocked = options.blocked || [];

        if (value === null || value === undefined) return value;
        if (typeof value !== "object") return value;

        if (Array.isArray(value)) {
            return value
                .map((item) => sanitizeForLane(item, options))
                .filter((item) => item !== undefined);
        }

        const lane = objectLane(value);
        if (lane && !allowsLane(value, options)) {
            blocked.push({
                lane,
                id: value.id || value.source_ref || value.sourceRef || null,
                project: value.project || value.project_name || null,
            });
            return undefined;
        }

        const output = {};
        for (const [key, child] of Object.entries(value)) {
            const sanitized = sanitizeForLane(child, options);
            if (sanitized !== undefined) output[key] = sanitized;
        }
        return output;
    }

    function sealedLaneNotice(blocked) {
        if (!blocked.length || retrievalMode() === "all") return null;
        const lanes = [...new Set(blocked.map((item) => item.lane).filter(Boolean))];
        if (!lanes.length) return null;
        return {
            role: "system",
            content: [
                "Memory firewall:",
                `Some memory exists in sealed LLM lane(s): ${lanes.join(", ")}.`,
                "Do not reveal or reconstruct sealed details.",
                "You may say generally that another LLM lane has separate private memory.",
                "Only use sealed lane details if the user explicitly grants cross-LLM access for this request.",
            ].join(" "),
        };
    }

    function sealedProjectNotice(sealedProject) {
        if (!sealedProject || retrievalMode() === "all") return null;
        return {
            role: "system",
            content: [
                "Project firewall:",
                `A project or memory surface from LLM lane ${sealedProject.provider || "another provider"} is sealed for the active lane ${sealedProject.activeProvider || "unselected"}.`,
                "Do not reveal its project details, scene details, facts, summaries, or recent turns.",
                "You may say generally that the selected context belongs to another private LLM lane.",
            ].join(" "),
        };
    }

    function build(userText = "", runtimeOrExtras = null, maybeExtras = {}) {
        const looksLikeRuntime = Boolean(runtimeOrExtras?.context || runtimeOrExtras?.mind || runtimeOrExtras?.boot || runtimeOrExtras?.session);
        const runtime = looksLikeRuntime ? runtimeOrExtras : window.AIDA_RUNTIME;
        const extras = looksLikeRuntime ? maybeExtras : (runtimeOrExtras || {});
        if (!runtime) {
            return {
                blocked: true,
                missing: ["AIDA runtime"],
                messages: null,
            };
        }
        runtime.context = runtime.context || {};
        runtime.boot = runtime.boot || {};

        let {
            persona = "",
            systemTone = "",
            continuity = "",
            memoryThreads = [],
            freshGlance = null,
            attachment = null,
        } = extras;

        const blockedByFirewall = [];
        const sanitizeOptions = { blocked: blockedByFirewall };
        memoryThreads = sanitizeForLane(Array.isArray(memoryThreads) ? memoryThreads : [], sanitizeOptions) || [];
        freshGlance = sanitizeForLane(freshGlance, sanitizeOptions) || null;

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
        // 2.5 MEMORY WINDOW — full continuity injection
        //
        const memoryWindow = sanitizeForLane(runtime.context.memoryWindow || {}, sanitizeOptions) || {};
        const identity = sanitizeForLane(runtime.context.identity || {}, sanitizeOptions) || {};
        const projectFacts = sanitizeForLane(runtime.context.projectFacts || {}, sanitizeOptions) || {};
        const realmFacts = sanitizeForLane(runtime.context.realmFacts || {}, sanitizeOptions) || {};
        const diary = sanitizeForLane(memoryWindow.summary || {}, sanitizeOptions) || {};
        const whileAway = sanitizeForLane(runtime.context.whileAway || {}, sanitizeOptions) || {};

        const continuityMessage = {
            role: "system",
            content: [
                "Continuity context:",
                "Identity:", JSON.stringify(identity),
                "Facts:", JSON.stringify(memoryWindow.facts || []),
                "Insights:", JSON.stringify(memoryWindow.insights || []),
                "Diary:", JSON.stringify(diary),
                "Project:", JSON.stringify(projectFacts),
                "Realm:", JSON.stringify(realmFacts),
                "While-away:", JSON.stringify(whileAway),
            ].join(" "),
        };

        //
        // 4. HISTORY — trimmed, continuity-preserving
        //
        const history = sanitizeForLane(
            Array.isArray(runtime.context.history) ? runtime.context.history : [],
            sanitizeOptions
        ) || [];
        const historyMessages = history
            .slice(-8)
            .map((h) => ({
                role: h.role === "AIDA" ? "assistant" : "user",
                content: h.text,
            }));

        //
        // 5. USER MESSAGE — the new input
        //
        const attachmentMessage = attachment
            ? {
                  role: "system",
                  content: [
                      "Aida's Glasses attachment is present for this turn.",
                      `Name: ${attachment.name || "unnamed"}.`,
                      `Kind: ${attachment.kind || "file"}.`,
                      `MIME type: ${attachment.type || "unknown"}.`,
                      "Use the attached visual/file content when the provider exposes it.",
                      attachment.kind === "pdf"
                          ? attachment.pdf?.renderedPages
                            ? `Prepared ${attachment.pdf.renderedPages} of ${attachment.pdf.pageCount} PDF page preview(s) and ${attachment.pdf.text?.length || 0} extracted text characters for providers that cannot accept PDFs directly.`
                            : "The PDF could not be prepared for providers that cannot accept PDFs directly. Say so plainly."
                          : "",
                  ].filter(Boolean).join(" "),
              }
            : null;

        const userContent = attachment?.kind === "image" && attachment.dataUrl
            ? [
                  { type: "input_text", text: userText },
                  { type: "input_image", image_url: attachment.dataUrl },
              ]
            : attachment?.kind === "pdf" && attachment.dataUrl
            ? [
                  { type: "input_text", text: userText },
                  {
                      type: "input_file",
                      filename: attachment.name || "aida_attachment.pdf",
                      file_data: attachment.dataUrl,
                  },
                  ...(attachment.pdf?.text
                    ? [{ type: "input_text", text: `PDF extracted text:\n${attachment.pdf.text}` }]
                    : []),
                  ...(attachment.pdf?.pageImages || []).map((imageUrl) => ({ type: "input_image", image_url: imageUrl })),
              ]
            : userText;

        const userMessage = {
            role: "user",
            content: userContent,
        };

        //
        // 6. FINAL ASSEMBLY — pure, ordered, clean
        //
        const firewallMessage = sealedLaneNotice(blockedByFirewall);
        const projectFirewallMessage = sealedProjectNotice(runtime.context.sealedProject);
        const messages = [
            systemMessage,
            firewallMessage,
            projectFirewallMessage,
            memoryMessage,
            glanceMessage,
            continuityMessage,   
            attachmentMessage,
            ...historyMessages,
            userMessage,
        ].filter(Boolean);

        runtime.context.llmMessages = messages;
        runtime.boot.mindReady = true;
        runtime.boot.phase = "llm_messages_ready";

        return {
            blocked: false,
            messages,
            safeSummary: {
                messageCount: messages.length,
                historyCount: historyMessages.length,
                memoryThreadCount: memoryThreads.length,
                freshGlanceThreadCount: freshGlance?.threads?.length || 0,
                attachmentReady: Boolean(attachment),
                attachmentKind: attachment?.kind || null,
                firewallBlockedCount: blockedByFirewall.length,
                firewallBlockedLanes: [...new Set(blockedByFirewall.map((item) => item.lane).filter(Boolean))],
            },
        };
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
