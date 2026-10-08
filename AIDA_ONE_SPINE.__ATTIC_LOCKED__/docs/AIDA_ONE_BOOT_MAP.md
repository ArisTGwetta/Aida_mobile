# AIDA-One Boot Map

This document is the source of truth for what is supposed to happen, when it happens, and which layer owns each step.

## Boot Principle

The app must not become a hardcoded chatbot. The boot flow exists to assemble Aida from her actual organs and private Drive memory before the LLM is allowed to speak as Aida.

## Phase 0: Static Load

Owner: `index.html`

Purpose: Load the page, styles, body shell, and script entrypoints.

Allowed:

- Render BIOS/wakeup shell.
- Load spine scripts.
- Load organ package manifests.

Not allowed:

- Call the LLM.
- Fake Aida identity from generic defaults.
- Build final system prompts.

## Phase 1: Local Wake Gate

Owner: `body/awake` and optional `spine/local_gate`

Purpose: Preserve the wake/security ceremony before private cloud authentication begins.

Outputs:

- `AIDA_RUNTIME.boot.localGateCleared`

Not allowed:

- Pretend this is cryptographic security.
- Store or assemble long-lived secrets from public/static source code.

## Phase 2: Google Drive Handshake

Owner: `spine/drive`

Purpose: Authenticate and connect to the private Aida data vault.

Outputs:

- `AIDA_RUNTIME.tokens.drive.accessToken`
- `AIDA_RUNTIME.boot.driveConnected`

Not allowed:

- Fetch private data before OAuth is complete.
- Use multiple token names for the same Drive token.
- Assemble or fake a Google token in the keypad. Google OAuth issues the Drive access token.

## Phase 3: Drive Memory Fetch

Owner: `spine/drive`

Purpose: Load private JSON files from Drive into the runtime, including any private OpenAI key fragments.

Outputs:

- `AIDA_RUNTIME.drive.files`
- `AIDA_RUNTIME.mind.identity`
- `AIDA_RUNTIME.mind.memory`
- `AIDA_RUNTIME.mind.facts`
- `AIDA_RUNTIME.mind.insights`
- `AIDA_RUNTIME.mind.emotion`
- `AIDA_RUNTIME.mind.realm`
- `AIDA_RUNTIME.mind.role`
- `AIDA_RUNTIME.mind.session`
- `AIDA_RUNTIME.tokens.openai.fragments`

Fallbacks are allowed only as offline boot mirrors. They must be visibly marked as fallback state in diagnostics and must never replace real Drive data silently.

## Phase 4: OpenAI Airlock

Owner: `spine/airlock`

Purpose: Use the keypad ceremony to assemble the OpenAI key from Drive-loaded private fragments.

Outputs:

- `AIDA_RUNTIME.tokens.openai.key`
- `AIDA_RUNTIME.boot.airlockCleared`

Not allowed:

- Store real OpenAI fragments in public GitHub/static files for deployed use.
- Assemble the OpenAI key before Google OAuth and Drive fragment fetch succeed.
- Let LLM calls read from anywhere except the runtime token contract.

## Phase 5: Python Organ Mount

Owner: `spine/pyodide`

Purpose: Load Pyodide once and mount JS-wrapped Python organs into the virtual filesystem.

Outputs:

- `AIDA_RUNTIME.py.ready`
- `AIDA_RUNTIME.py.organsMounted`

Not allowed:

- Start more than one Pyodide boot path.
- Mount organ filenames that do not match the imports used by the spine.

## Phase 6: Mind Assembly

Owner: `spine/context`

Purpose: Inject Drive-backed mind state into Python and assemble the active context.

Outputs:

- `AIDA_RUNTIME.context.identity`
- `AIDA_RUNTIME.context.realm`
- `AIDA_RUNTIME.context.role`
- `AIDA_RUNTIME.context.emotion`
- `AIDA_RUNTIME.context.tetrad`
- `AIDA_RUNTIME.context.memoryWindow`
- `AIDA_RUNTIME.context.project`
- `AIDA_RUNTIME.context.projectFacts`
- `AIDA_RUNTIME.context.projectSummaries`

Not allowed:

- Let the LLM build messages from raw scattered globals.
- Bypass identity, memory, emotion, realm, or role.
- Leave the active realm/project ambiguous before an LLM call.
- Call the LLM without the active role, relevant facts, and summaries for that realm/project.

## Phase 7: Arrival

Owner: `body/awake`

Purpose: Transition from BIOS/code to Aida presence.

Outputs:

- Awake ceremony complete.
- Main interface available.
- Hologram/face engine active.

Not allowed:

- Show Aida as present before minimum mind assembly is complete, unless explicitly in diagnostic/offline mode.

## Phase 8: Conversation Loop

Owner: `spine/conversation`

Purpose: Process user input through mind pass, LLM pass, output delivery, emotion update, and session logging.

Flow:

1. User input captured.
2. Mind pass updates active emotion/context.
3. Pre-LLM context gate confirms active realm/project, role, facts, and summaries are present or explicitly marked unavailable.
4. Message builder assembles LLM messages from `AIDA_RUNTIME.context`.
5. LLM response returns.
6. Output is displayed.
7. Session/journal candidates are queued.
8. Emotion/face update runs.

Not allowed:

- Send a user message directly to OpenAI with only a generic system prompt.
- Hardcode Aida's personality outside the identity/context pipeline.
- Treat project memory as optional decoration when a project or realm is active.

## Phase 9: Sleep / While Away

Owner: `spine/sleep`

Purpose: Persist meaningful state and prepare next re-entry.

Outputs:

- Updated session log.
- Distilled journal entry.
- Updated facts/insights when warranted.
- Updated emotion state.
- While-away seed or re-entry script.
- Drive sync queue flushed.

Not allowed:

- Store raw chat as the only long-term memory.
- Lose last active state.
- Invent while-away thoughts with no connection to memory, projects, or interests once real data exists.
