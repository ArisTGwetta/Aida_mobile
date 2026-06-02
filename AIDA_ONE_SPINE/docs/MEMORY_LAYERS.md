# Memory Layers

Aida's memory should not collapse into one blob. Each layer has a different job.

## Current Session

Active in-memory capture of the conversation now happening.

Runtime:

```text
AIDA_RUNTIME.session.currentTurns
AIDA_RUNTIME.session.unsaved
```

Purpose:

- Immediate continuity.
- Input for sleep routines.
- Safe foundation before summaries, diary, facts, or Drive writes.

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
