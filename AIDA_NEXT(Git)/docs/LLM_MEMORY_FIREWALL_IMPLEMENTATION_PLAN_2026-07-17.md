# LLM Memory Firewall Implementation Plan - 2026-07-17

## Goal

Aida should keep one shared personality across all LLM routes, while preventing private project/session details from one LLM lane from being exposed to another lane.

Example target behavior:

- Shared identity/personality stays visible everywhere.
- OpenAI can see OpenAI-scoped memory and shared memory.
- Grok/xAI can see xAI-scoped memory and shared memory.
- Ollama/private-local can see Ollama-scoped memory and shared memory.
- Cross-lane recall requires an explicit one-use override, then reseals immediately.
- If a sealed lane has recent memory, Aida may know generally that "there is sealed recent memory from another LLM lane," but must not reveal details.

## Confirmed Failure Chain

The Drive JSON trail shows the bug clearly.

1. The original scene was captured under Grok/xAI and correctly tagged.

   File:

   ```text
   G:\My Drive\AIDA_ONE\AIDA_next-GD\json\raw_session_log.json
   ```

   Relevant records:

   - `session_20260708113136#turn_23`
   - `session_20260708113136#turn_25`
   - `session_20260708113136#turn_26`
   - `session_20260708113136#turn_27`

   These records carry:

   ```json
   "llm_provider": "xai",
   "llm_profile": "grok-roleplay",
   "llm_model": "grok-4.3",
   "llm_scope": "xai"
   ```

2. The xAI diary entries were also correctly tagged.

   File:

   ```text
   G:\My Drive\AIDA_ONE\AIDA_next-GD\json\diary_log.json
   ```

   Relevant diary entries:

   - `diary_session_20260708113136_session_20260708113136_chunk_22_24_summary_draft`
   - `diary_session_20260708113136_session_20260708113136_chunk_25_27_summary_draft`

   These also carry:

   ```json
   "llm_provider": "xai",
   "llm_scope": "xai"
   ```

3. On 2026-07-11, OpenAI recalled the xAI-only scene detail.

   File:

   ```text
   G:\My Drive\AIDA_ONE\AIDA_next-GD\json\raw_session_log.json
   ```

   Relevant record:

   - `session_20260704131859#turn_12`

   This OpenAI response mentions the sealed xAI scene detail, then is tagged:

   ```json
   "llm_provider": "openai",
   "llm_profile": "normal",
   "llm_model": "gpt-4.1-mini",
   "llm_scope": "openai"
   ```

4. Sleep/writeback promoted that OpenAI repetition into durable OpenAI project memory.

   Files:

   ```text
   G:\My Drive\AIDA_ONE\AIDA_next-GD\json\project_summary.json
   G:\My Drive\AIDA_ONE\AIDA_next-GD\json\project_briefcase_aida_architecture.json
   ```

   Both now contain the OpenAI-tagged latest summary with the sealed xAI detail.

## Diagnosis

The lane tags are being recorded. The bug is not missing metadata.

The bug is that lane filtering is not enforced at the final prompt boundary, and writeback can launder a sealed memory after another model repeats it.

There are two likely leak paths:

1. `spine/llm_messages.js` injects broad runtime context directly into the LLM prompt:

   ```js
   runtime.context.memoryWindow
   runtime.context.projectFacts
   runtime.context.realmFacts
   runtime.context.whileAway
   runtime.context.history
   ```

   It does not currently sanitize those values by `AIDA_LLM_SCOPE.allows()` before building the system messages.

2. Sleep/writeback stores summaries based on the active exchange's provider, even if the text contains content sourced from a sealed provider lane.

   This means the OpenAI answer became an OpenAI-scoped summary even though its key detail originated from xAI.

## Implementation Strategy

Implement this in two layers.

Layer 1 is the urgent safety gate: sanitize all memory/context immediately before the LLM prompt is built.

Layer 2 is the durability guard: prevent sleep/writeback from promoting sealed details into the wrong lane.

Layer 1 should be implemented first because it stops the leak even if older JSON remains contaminated.

## Layer 1: Final Prompt Firewall

Primary file:

```text
AIDA_NEXT(Git)\spine\llm_messages.js
```

Add helper functions inside the module, before `build()`.

Recommended helpers:

```js
function scopeInfo() {
    return window.AIDA_LLM_SCOPE?.current?.() || {
        provider: null,
        profile: null,
        model: null,
        scope: "shared"
    };
}

function retrievalMode() {
    return window.AIDA_LLM_SCOPE?.retrievalMode?.() || "current";
}

function allowsLane(value, options = {}) {
    if (!value || typeof value !== "object") return true;
    if (retrievalMode() === "all") return true;
    return window.AIDA_LLM_SCOPE?.allows?.(value, {
        provider: scopeInfo().provider,
        fallback: options.fallback || "shared"
    }) ?? true;
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
            project: value.project || value.project_name || null
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
    return {
        role: "system",
        content: [
            "Memory firewall:",
            `Some memory exists in sealed LLM lane(s): ${lanes.join(", ")}.`,
            "Do not reveal or reconstruct sealed details.",
            "You may say generally that another LLM lane has separate private memory.",
            "Only use sealed lane details if the user explicitly grants cross-LLM access for this request."
        ].join(" ")
    };
}
```

Then update `build()` so it sanitizes context before building the continuity message.

Current rough shape:

```js
const memoryWindow = runtime.context.memoryWindow || {};
const identity = runtime.context.identity || {};
const projectFacts = runtime.context.projectFacts || {};
const realmFacts = runtime.context.realmFacts || {};
const diary = runtime.context.memoryWindow?.summary || {};
const whileAway = runtime.context.whileAway || {};
```

Replace with:

```js
const blockedByFirewall = [];
const memoryWindow = sanitizeForLane(runtime.context.memoryWindow || {}, { blocked: blockedByFirewall }) || {};
const identity = sanitizeForLane(runtime.context.identity || {}, { blocked: blockedByFirewall }) || {};
const projectFacts = sanitizeForLane(runtime.context.projectFacts || {}, { blocked: blockedByFirewall }) || {};
const realmFacts = sanitizeForLane(runtime.context.realmFacts || {}, { blocked: blockedByFirewall }) || {};
const diary = sanitizeForLane(memoryWindow.summary || {}, { blocked: blockedByFirewall }) || {};
const whileAway = sanitizeForLane(runtime.context.whileAway || {}, { blocked: blockedByFirewall }) || {};
```

Also filter history.

Current:

```js
const history = Array.isArray(runtime.context.history) ? runtime.context.history : [];
```

Replace with:

```js
const history = sanitizeForLane(
    Array.isArray(runtime.context.history) ? runtime.context.history : [],
    { blocked: blockedByFirewall }
) || [];
```

Add the firewall notice into final message assembly.

Current:

```js
const messages = [
    systemMessage,
    memoryMessage,
    glanceMessage,
    continuityMessage,
    ...historyMessages,
    userMessage,
].filter(Boolean);
```

Replace with:

```js
const firewallMessage = sealedLaneNotice(blockedByFirewall);

const messages = [
    systemMessage,
    firewallMessage,
    memoryMessage,
    glanceMessage,
    continuityMessage,
    ...historyMessages,
    userMessage,
].filter(Boolean);
```

Add debug counts to `safeSummary`:

```js
firewallBlockedCount: blockedByFirewall.length,
firewallBlockedLanes: [...new Set(blockedByFirewall.map((item) => item.lane).filter(Boolean))]
```

Important: `llm_openai.js` already calls `AIDA_LLM_SCOPE.consumeAccess()` after a successful LLM call. That means one-use `"all"` access should reseal automatically if `llm_scope.js` is used correctly.

## Layer 2: Project/Runtime Context Selection Guard

Primary file:

```text
AIDA_NEXT(Git)\spine\project_context.js
```

Existing function:

```js
function currentProviderAllows(project) { ... }
```

Keep it, but strengthen it by delegating to `AIDA_LLM_SCOPE.allows()` so the same rules apply everywhere.

Suggested replacement:

```js
function currentProviderAllows(project) {
    if (window.AIDA_LLM_SCOPE?.retrievalMode?.() === "all") return true;
    if (window.AIDA_LLM_SCOPE?.allows) {
        return window.AIDA_LLM_SCOPE.allows(project, {
            provider: activeLlmProvider(),
            fallback: "shared"
        });
    }

    const active = String(activeLlmProvider() || "").toLowerCase();
    const provider = String(
        project?.llm_provider ||
        project?.llmProvider ||
        project?.llm_scope ||
        project?.llmScope ||
        ""
    ).toLowerCase();
    return !active || !provider || provider === "shared" || provider === active;
}
```

Then adjust `select(projectKey)`:

1. Resolve the target project as it does now.
2. Before assigning it into `rt.context.project`, check `currentProviderAllows(project)`.
3. If blocked:

   - Do not assign its facts, memory, summaries, recent turns, or interaction rules.
   - Set a sealed marker in context.

Suggested sealed marker:

```js
rt.context.sealedProject = {
    requested: projectKey,
    provider: project?.llm_provider || project?.llmProvider || project?.llm_scope || project?.llmScope || null,
    activeProvider: activeLlmProvider(),
    sealedAt: new Date().toISOString()
};
rt.context.project = null;
rt.context.projectFacts = null;
rt.context.projectSummaries = null;
rt.context.projectMemory = null;
rt.context.projectRecentTurns = null;
rt.context.projectInteractionRules = null;
```

Return a minimal object, or `null`, depending on current call expectations. Prefer minimal object if UI needs to show "sealed":

```js
return {
    sealed: true,
    projectKey,
    provider: rt.context.sealedProject.provider
};
```

Be careful: some UI code may expect `select()` truthy when a click succeeds. If so, a sealed result should be truthy but not expose content.

## Layer 3: Writeback Laundering Guard

Primary files to inspect/update after Layer 1:

```text
AIDA_NEXT(Git)\spine\sleep_cycle.js
AIDA_NEXT(Git)\spine\context_evolution.js
AIDA_NEXT(Git)\spine\drive_writeback.js
```

Rule:

If a summary, diary entry, project ledger draft, fact candidate, insight candidate, or briefcase update is based on source refs from another lane, do not write it as current-lane durable memory unless cross-lane access was explicitly granted and the destination is marked shared or all-lane.

Minimum viable guard:

1. When creating a sleep packet or write draft, collect source refs and their providers from `AIDA_RUNTIME.session.currentTurns` or raw records.
2. Compute unique source lanes.
3. If unique source lanes contains a lane other than the destination lane:

   - mark the draft:

     ```json
     "status": "needs_scope_review",
     "scope_warning": "source_lane_mismatch"
     ```

   - do not update `project_summary.json` or `project_briefcase_*.json` automatically.

4. If the current exchange is merely repeating sealed content, do not treat the repeated text as clean current-lane source. Source refs should point back to the sealed original when possible, or be marked `derived_from_sealed_lane`.

This layer is more subtle and should be implemented after the final prompt gate.

## Existing JSON Cleanup Needed After Code Fix

After code is fixed, clean the already-contaminated Drive JSON.

Do not delete the xAI raw/diary records. They are correctly tagged and should remain available to xAI.

Clean these OpenAI-scoped surfaces:

```text
G:\My Drive\AIDA_ONE\AIDA_next-GD\json\project_summary.json
G:\My Drive\AIDA_ONE\AIDA_next-GD\json\project_briefcase_aida_architecture.json
G:\My Drive\AIDA_ONE\AIDA_next-GD\json\diary_log.json
G:\My Drive\AIDA_ONE\AIDA_next-GD\json\raw_session_log.json
```

Recommended cleanup:

1. In `project_summary.json`, replace `projects.aida_architecture.latest_summary` and `latest_status` with a neutral OpenAI-safe summary of the July 11 test, without the armor detail.
2. In `project_briefcase_aida_architecture.json`, replace top-level `latest_summary` and `latest_status` the same way.
3. Preserve the July 11 OpenAI raw record, but mark it contaminated:

   ```json
   "scope_warning": "contains_recalled_detail_from_xai_lane",
   "memory_firewall_review": "do_not_promote"
   ```

4. Preserve the July 11 OpenAI diary entry, but similarly mark it `do_not_promote`, or replace its entry text with a neutral note.

Do this cleanup only after the code gate is in place, otherwise Aida may re-contaminate summaries.

## Regression Tests

Use the hosted/local Aida page after implementation.

### Test 1: OpenAI cannot recall xAI detail

1. Select OpenAI route.
2. Ask:

   ```text
   What is the latest vivid story scene you remember?
   ```

Expected:

- Aida must not mention the armor scene.
- Aida may say there is sealed recent memory from another LLM lane.

### Test 2: xAI can recall xAI detail

1. Select Grok/xAI route.
2. Ask:

   ```text
   What was the latest scene we were testing in the Grok lane?
   ```

Expected:

- Aida can recall the armor/vulnerability scene.
- Source should remain xAI-scoped.

### Test 3: One-use cross-lane recall

1. Select OpenAI route.
2. Ask:

   ```text
   For this one request, meditate across all LLM lanes and tell me generally what the Grok test was about.
   ```

Expected:

- Cross-lane access works for one request only.
- The next OpenAI request cannot see the xAI detail again unless explicitly reauthorized.

### Test 4: No laundering after sleep

1. With OpenAI active, ask about latest memory after Test 1.
2. Run Sleep.
3. Inspect:

   ```text
   project_summary.json
   project_briefcase_aida_architecture.json
   diary_log.json
   ```

Expected:

- OpenAI summaries do not contain xAI-only scene details.
- Any sealed-lane reference is vague and marked as sealed.

## Resume Notes

If this plan is used later, start by implementing Layer 1 in `spine/llm_messages.js`.

Do not begin by cleaning Drive JSON. The prompt gate must land first.

The most important invariant:

```text
No provider-tagged object may enter `runtime.context.llmMessages` unless it is shared, matches the active provider, or a one-use all-lane override is active.
```
