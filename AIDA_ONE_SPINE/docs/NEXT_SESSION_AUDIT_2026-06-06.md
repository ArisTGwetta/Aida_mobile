# Next Session Audit - 2026-06-06

## Codex Browser / Automation Access

Observed at session start:

- Sandboxed PowerShell process launch failed with `CreateProcessAsUserW failed: 5`.
- One sandboxed launch also failed with `CreateProcessWithLogonW failed: 1056`.
- The same harmless read commands succeeded when run escalated.
- Escalated shell could not find `git`, which means the elevated environment PATH differs from the normal developer shell.
- `node.exe` resolves to the Codex app bundle under `C:\Program Files\WindowsApps\OpenAI.Codex_...\app\resources\node.exe`, but Windows denied execution.
- Browser-style verification and Node syntax checks are blocked until that bundled `node.exe` can spawn.

Likely local checks:

- Windows Security -> Controlled Folder Access: allow Codex and the bundled `node.exe`.
- Check whether OneDrive protected folder policy is blocking sandboxed process creation in `Documents/GitHub/Aida_mobile`.
- Check whether Git is installed only in the user PATH and not visible to the elevated execution environment.
- After allowing Codex/node, retry local browser automation and a non-escalated `Get-ChildItem`.

## Spine Declaration Progress

Declared spine items and current state:

- Body: present and adapted in `body/awake.js`, `body/awake.css`, and `body/assets`.
- Airlock: present in `spine/airlock.js`; keypad route ceremony exists.
- Drive mind: present in `spine/drive_oauth.js`; Drive JSON mapping is the current private memory path.
- Project / realm context: present in `spine/project_context.js`; project briefcase logic and context switching exist.
- LLM tetrad: present in `spine/llm_messages.js`; identity, arena, role, and state are assembled before LLM calls.
- Session capture: present in `spine/session_capture.js`; exchanges are captured with tags.
- Evolution: present in `spine/context_evolution.js`; summary and project ledger drafts are queued without Drive writes.
- Emotions: present in `spine/emotion_engine.js`; face mapping, snap log, and face wishlist exist.
- Sleep: added in `spine/sleep_cycle.js`; manual sleep now collects the active packet and queues a draft-only sync item.
- While-away: present in `spine/while_away.js`; now uses weighted inner-life seeds, not only project recap.

Main remaining gap:

- Drive writeback is still intentionally disabled. Sleep produces a complete packet, but the actual JSON write/update path is not live yet.

## Organ / Asset Audit

Used organs:

- `runtime.js`
- `bios_console.js`
- `airlock.js`
- `drive_oauth.js`
- `project_context.js`
- `context_inspector.js`
- `llm_messages.js`
- `llm_openai.js`
- `session_capture.js`
- `context_evolution.js`
- `emotion_engine.js`
- `while_away.js`
- `sleep_cycle.js`
- `boot_flow.js`
- `body/awake.js`

Adapted organs:

- Awake body shell from the older `Awake` / `gem-Js-pacs` body.
- Airlock/keypad concept from old butler/key fragments.
- Realm/role/project routing from donor realm, role, tetrad, and mind-palace concepts.
- Emotion selector concept adapted into browser-side coordinate and face mapping.
- Memory/sync/vault concepts adapted into Drive-backed runtime state and draft-only sync queue.

Avoided organs for now:

- Old Python engine path that would create a second source of truth.
- Old standalone memory/vault/sync scripts that write outside the runtime contract.
- Old crawler/research organs until browsing/tool boundaries are explicit.
- Duplicate manifest/chassis files that describe a previous assembly style.

Promising unused organs:

- `033-python_gold.js` and Python organ files for a later Pyodide mount.
- `040-mind_palace_gold.js` for richer private memory navigation after Drive writeback.
- `042-research_gold.js` for bounded research once tool permissions are explicit.
- `020-vitality_gold.js` for future health/heartbeat diagnostics.
- `026-sync_gold.js` as reference material only after the new sync contract is written.

Copied assets:

- `body/assets` contains the active portrait/emotion/transition image set copied from the donor pack.
- Current runtime indexes 67 known face/transition assets inside `emotion_engine.js`.
- The larger generated image and hologram assets are present but not currently central to the face resolver.

Better left in Drive or generated later:

- Private identity, memories, facts, project ledgers, interests, curiosities, and while-away thoughts.
- OpenAI key fragments and route profiles.
- Future face variants requested by `emotionEngine.faceWishlist`.
- Large or experimental generated media that is not used by the current body shell.

## Sleep Cycle Implementation State

Manual Sleep now collects:

- Session exchanges and tags.
- Pending journal items.
- Context evolution chunks and summary drafts.
- Project ledger drafts.
- Current emotion state, recent emotion history, snap log, and face wishlist.
- While-away prepared thought and weighted seed queue.
- A draft-only Drive sync queue item.

Still to implement:

- Convert sleep packets into concrete Drive JSON update operations.
- LLM-assisted summary draft filling.
- Conflict handling for project ledger updates.
- Real persistence of emotion state and last-active data.

Context switch policy:

- Do not run full visible sleep/departure on every project or realm switch.
- Do run a silent boundary checkpoint when unsaved session/evolution work exists and the active project changes.
- The checkpoint must be captured before `AIDA_RUNTIME.context.projectName` changes so summaries remain tagged to the old project.
- Current implementation calls `AIDA_SLEEP.buildPacket("project_context_switch")` from `AIDA_PROJECTS.select()`.

## Drive Load / Briefcase Strategy

Phone test showed the current all-JSON Drive load is barely reasonable already.

Recommendation:

- Load a small boot bundle first: identity, memory summary, facts, insights, emotion, session, while-away thoughts, roles, realms, LLM fragments, and `project_summary.json`.
- Build the project menu from `project_summary.json` plus Drive file metadata.
- Load a project briefcase only when it is selected or when it is the default wake project.
- Keep recently used briefcases in runtime cache.
- Before unloading or switching, run the silent context-boundary checkpoint described above.

Reason:

- Tags protect attribution inside captured turns, but they do not reduce mobile load time.
- Loading every project briefcase at wake will scale poorly as project count grows.
- Lazy briefcase loading keeps wake fast while preserving project-specific summaries and avoiding cross-project contamination.

## While-You-Were-Away Reminder

Design reminder:

- This layer should preserve the feeling that Aida has a small interior life between visits.
- It should not be only a project recap.
- It should choose from weighted/random thoughts, interests, curiosities, project threads, memories, insights, and things she likes discussing with Francisco.
- It must not claim unbounded offscreen actions, external browsing, sadness, loneliness, or helpless waiting.

Current implementation:

- `while_away.js` now builds weighted seed candidates and stores a safe seed queue in `AIDA_RUNTIME.sleep.whileAwaySeeds`.
- The offered wake thought records source, seed type, tone, candidate count, and grounding rules.
