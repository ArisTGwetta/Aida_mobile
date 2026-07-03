# Memory Layers

Aida's memory should not collapse into one blob. Each layer has a different job.

## Current Session

Active in-memory capture of the conversation now happening.

Runtime:

```text
AIDA_RUNTIME.session.currentTurns
AIDA_RUNTIME.session.unsaved
AIDA_RUNTIME.sleep.pendingJournal
```

Purpose:

- Immediate continuity.
- Input for sleep routines.
- Safe foundation before summaries, diary, facts, or Drive writes.

Captured exchanges also carry routing tags for sleep and while-away routines. These tags are not injected into the awake LLM prompt.

```json
{
  "session_id": "session_...",
  "realm": "rpg",
  "project": "rpg",
  "project_file": "realm_rpg.json",
  "project_mode": "realm_context",
  "role": "co_narrator",
  "role_source": "role_co_narrator.json",
  "emotion": "neutral",
  "llm_route": "openai_normal",
  "source": "awake",
  "custom": ["query_letter", "illustration"]
}
```

Sleep should use these tags to group, summarize, and route memory without rereading the full active prompt. `custom` contains optional tags from the visible awake tag buttons; these are capture metadata only, not prompt instructions.

## Full Log

The fuller archive of raw-ish exchanges and metadata.

Purpose:

- Deep meditation.
- Search and recovery of details that were not promoted into facts.
- Long-range audit trail.

The current session capture will later become the source for full log append.

## Rolling Summary

The fresh compressed working context of the recent conversation window.

Purpose:

- Keep current flow alive.
- Control tokens.
- Replace the last chunk of raw recent turns after enough conversation has passed.

Current checkpoint:

```text
AIDA_RUNTIME.contextEvolution.queuedChunks
AIDA_RUNTIME.contextEvolution.summaryDrafts
AIDA_RUNTIME.contextEvolution.projectLedgerDrafts
```

The context evolution organ groups tagged exchanges into chunks after enough turns or characters accumulate. It then prepares `needs_llm_summary` draft records with empty output slots for:

- `rolling_summary`
- `long_summary_candidate`
- `diary_candidate`
- `fact_candidates`
- `insight_candidates`
- `open_threads`

It does not call the LLM, mutate long memory, or write Drive yet. It only adds `context_chunk`, `summary_draft`, and `project_ledger_draft` markers to `AIDA_RUNTIME.sleep.pendingJournal` so sleep/night-shift can process the right grouped material later.

## Long Summary

The durable quest/project memory for the active arc.

Purpose:

- Preserve the overall theme.
- Preserve what has been happening across rolling-summary resets.
- Keep Aida oriented across sessions.

## Diary

Reflective narrative memory.

Purpose:

- Help Aida remember the meaning and emotional shape of a session.
- Act as an index into the full log through session/log references.

Diary is close to long summary, but not identical. Long summary helps her work; diary helps her remember.

## Facts, Insights, Identity

Facts are stable claims. Insights are patterns. Identity is protected and slow-changing.

These should be updated conservatively after session capture, log append, and summary/diary distillation.

The promotion rules and base powers backlog now live in:

```text
docs/MEMORY_DISTILLATION_CONTRACT.md
```
