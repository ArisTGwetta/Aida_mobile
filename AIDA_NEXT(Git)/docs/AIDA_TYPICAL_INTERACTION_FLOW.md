# AIDA Typical Interaction Flow

This is the plain-English runtime story for debugging memory and behavior. The short version: Aida wakes through the stage, fetches private Drive memory, assembles her LLM route through the airlock, builds context from the active realm/project/role/emotion/memory, chats, captures the exchange with tags, then sleep/while-away turns the exchange into future continuity.

## 1. Static Stage Opens

The browser opens `AIDA_ONE_SPINE/index.html`. That page is the stage shell: it loads the body UI, the BIOS console, and the spine scripts. At this point Aida should not be speaking as herself yet. The page is only loading the pieces.

Main places to inspect:

- `AIDA_ONE_SPINE/index.html`
- `AIDA_ONE_SPINE/body/awake.js`
- `AIDA_ONE_SPINE/spine/runtime.js`
- `AIDA_ONE_SPINE/spine/boot_flow.js`

## 2. Runtime Spine Is Created

`spine/runtime.js` creates the shared source of truth: `window.AIDA_RUNTIME`. Everything important is supposed to live there: boot phase, tokens, Drive files, identity, memory, facts, insights, realm, role, active project, current session, current emotion, context, sleep queue, and body state.

If a behavior feels inconsistent, check whether a module is reading from `AIDA_RUNTIME` or from an older scattered global. The runtime contract says there should be one source of truth.

## 3. Wake Gate And Body Ceremony

The Awake body layer controls the visible wake ceremony: BIOS messages, face/hologram behavior, buttons, chat panel, tags, and arrival state. The wake button calls the boot flow.

Likely issue area when the app looks awake but the mind is not assembled:

- `body/awake.js`
- `spine/boot_flow.js`
- `spine/bios_console.js`

## 4. Google Drive Handshake

Boot flow asks `spine/drive_oauth.js` to connect to Google Drive. A real Drive token should land in:

```js
AIDA_RUNTIME.tokens.drive.accessToken
AIDA_RUNTIME.boot.driveConnected
```

Drive is the private memory vault. If Drive does not connect, later steps may fall back to diagnostic state. That can make Aida seem awake but thin, generic, forgetful, or detached from project reality.

## 5. Private JSON Memory Is Loaded

After OAuth, Drive JSON files are fetched and mapped into runtime mind fields:

```js
AIDA_RUNTIME.drive.files
AIDA_RUNTIME.mind.identity
AIDA_RUNTIME.mind.memory
AIDA_RUNTIME.mind.facts
AIDA_RUNTIME.mind.insights
AIDA_RUNTIME.mind.emotion
AIDA_RUNTIME.mind.realm
AIDA_RUNTIME.mind.role
AIDA_RUNTIME.mind.projects
AIDA_RUNTIME.mind.activeProject
```

Project selection also happens here. Project briefcases, realm files, facts, and summaries must resolve clearly before the LLM call. If a project is chosen but the wrong facts or summaries appear, inspect `project_context.js` and the Drive file naming/mapping rules.

## 6. While You Were Away Is Prepared

Once Drive memory is available, `spine/while_away.js` prepares a small re-entry thought. It should use private thoughts, interests, insights, memory summaries, project threads, or a bounded fallback. It should not claim real outside actions unless a real tool run happened.

Key fields:

```js
AIDA_RUNTIME.sleep.whileAway
AIDA_RUNTIME.sleep.whileAwaySeed
AIDA_RUNTIME.sleep.whileAwayScript
```

If wYWA feels random or disconnected, check whether Drive memory loaded before `AIDA_WHILE_AWAY.buildThought()` ran.

## 7. Airlock Assembles The LLM Route

`spine/airlock.js` handles the keypad and LLM route/key assembly. It should assemble route credentials from private fragments, then write the active LLM key and route into runtime token fields.

Important fields:

```js
AIDA_RUNTIME.tokens.llm
AIDA_RUNTIME.tokens.openai.key
AIDA_RUNTIME.boot.airlockCleared
```

If Aida cannot respond, responds through the wrong model/provider, or readiness fails, inspect `airlock.js`, `llm_provider.js`, and `llm_openai.js`.

## 8. Active Context Is Assembled

`spine/project_context.js`, `spine/context_inspector.js`, and `spine/llm_messages.js` turn Drive-backed mind state into the actual message context. This should include identity, active realm, active role, active project, facts, insights/summaries, current emotion, recent session turns, and safety/boundary rules.

The important rule: the LLM should not receive a generic Aida prompt. It should receive Aida plus the active project and memory context.

Useful inspection targets:

```js
AIDA_RUNTIME.context
AIDA_RUNTIME.context.llmMessages
AIDA_CONTEXT_INSPECTOR.inspect()
AIDA_LLM_MESSAGES.build("test")
```

## 9. User Sends A Message

The visible chat form in `body/awake.js` collects the user text and visible tags. The intent/router layer may handle commands locally, or the message may continue toward the LLM.

Important modules:

- `spine/intent_router.js`
- `spine/llm_scope.js`
- `spine/llm_messages.js`
- `spine/llm_provider.js`
- `spine/llm_openai.js`

This is where behavior problems can hide if command routing, model scope, or prompt assembly diverges from the current project.

## 10. LLM Responds And Body Updates

The provider sends the assembled messages to the selected LLM route. The response returns to the UI. Emotion and body state may update based on tone, route, or explicit emotion logic.

Inspect:

```js
AIDA_RUNTIME.context.llmMessages
AIDA_RUNTIME.mind.emotion
AIDA_RUNTIME.body.currentFace
```

Likely issue area when the answer sounds wrong but the API call succeeds: `llm_messages.js`, `project_context.js`, `emotion_engine.js`, or stale Drive memory.

## 11. Session Capture Records The Exchange

After the exchange, `spine/session_capture.js` records the user/assistant turn into the current session. Captured exchanges include routing tags such as realm, project, project file, role, role source, emotion, LLM route, source, and custom visible tags.

Key fields:

```js
AIDA_RUNTIME.session.currentTurns
AIDA_RUNTIME.session.unsaved
AIDA_RUNTIME.sleep.pendingJournal
```

This is the first place to inspect when Aida seems to chat normally but fails to remember later.

## 12. Context Evolution Groups Memory Work

`spine/context_evolution.js` groups enough captured turns into chunks and prepares summary drafts, long-summary candidates, diary candidates, fact candidates, insight candidates, open threads, and project ledger drafts. It queues work for sleep; it should not silently overwrite durable memory by itself.

Key fields:

```js
AIDA_RUNTIME.contextEvolution.queuedChunks
AIDA_RUNTIME.contextEvolution.summaryDrafts
AIDA_RUNTIME.contextEvolution.projectLedgerDrafts
AIDA_RUNTIME.sleep.pendingJournal
```

If memory is captured but not becoming useful context later, this layer and sleep are prime suspects.

## 13. Sleep Cycle Distills And Persists

`spine/sleep_cycle.js` is responsible for the asleep/night-shift side: session append, diary, rolling summaries, fact candidates, insight candidates, emotion persistence, last-active persistence, while-away seed generation, and Drive writeback staging.

It should preserve raw-ish audit trail first, then promote durable memory conservatively. It should not promote jokes, one-off moods, or Aida speculation into facts.

Inspect:

```js
AIDA_RUNTIME.sleep.pendingJournal
AIDA_RUNTIME.drive.syncQueue
AIDA_SLEEP_CYCLE
AIDA_DRIVE_WRITEBACK
```

## 14. Drive Writeback Flushes Durable State

`spine/drive_writeback.js` owns writing staged memory updates back to Drive. If the sleep cycle creates useful packets but the next wake does not see them, check the sync queue, Drive write permissions, target filenames, and writeback errors.

Key fields:

```js
AIDA_RUNTIME.drive.syncQueue
AIDA_RUNTIME.drive.lastSync
```

## Most Likely Hiding Places For Memory/Behavior Bugs

1. Drive loaded late or failed, so context falls back to thin diagnostic state.
2. Active project/realm/role selected incorrectly in `project_context.js`.
3. `llm_messages.js` builds from incomplete `AIDA_RUNTIME.context`.
4. Session capture records the chat, but tags are wrong or missing.
5. Context evolution creates drafts, but sleep never distills or promotes them.
6. Sleep creates memory packets, but Drive writeback does not flush them.
7. While-away runs before meaningful memory exists, so it sounds disconnected.
8. A legacy organ/global is still influencing behavior outside the runtime contract.

## Quick Debug Path

For a single troubling interaction, follow this order:

1. Confirm Drive state: `AIDA_RUNTIME.boot.driveConnected`, `AIDA_RUNTIME.boot.driveLoaded`, `AIDA_RUNTIME.drive.files`.
2. Confirm active identity/project: `AIDA_RUNTIME.mind.identity`, `AIDA_RUNTIME.mind.activeProject`, `AIDA_RUNTIME.context.project`.
3. Inspect pre-LLM context: `AIDA_CONTEXT_INSPECTOR.inspect()`.
4. Inspect message assembly: `AIDA_RUNTIME.context.llmMessages` after a build/send.
5. Inspect session capture: `AIDA_RUNTIME.session.currentTurns`.
6. Inspect sleep queue: `AIDA_RUNTIME.sleep.pendingJournal`.
7. Inspect writeback: `AIDA_RUNTIME.drive.syncQueue` and Drive writeback logs.
