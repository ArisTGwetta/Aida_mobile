# Aida Smoke Runner

Small local smoke tests for AIDA-One Spine runtime behavior.

These tests are meant to run outside Codex when the Codex sandbox cannot launch the browser or local executables reliably.

## Sleep Distillation Smoke

Run from PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\aida-smoke-runner\run-sleep-distillation-smoke.ps1
```

Or run directly with Node:

```powershell
node .\tools\aida-smoke-runner\sleep-distillation-smoke.cjs
```

If `node` is not on `PATH`, the PowerShell wrapper tries the bundled Codex runtime Node:

```text
%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe
```

## What It Checks

The runner loads:

```text
AIDA_ONE_SPINE/spine/sleep_cycle.js
```

It installs a minimal mocked browser runtime and checks two cases:

- One-turn fallback: sleep still creates diary, rolling summary, long summary candidate, fact candidate, and insight candidate drafts even before context evolution has queued a chunk.
- Chunk draft path: existing `summaryDrafts` and `projectLedgerDrafts` are filled and marked `draft_filled`.
- LLM refinement path: a mocked OpenAI distillation response replaces fallback draft content, marks the packet `llm_draft_filled`, and preserves the fallback bundle.

Expected output is JSON with:

```json
{
  "status": "pass"
}
```

Failure returns non-zero exit code and prints JSON with the failed assertion.

## Scope

This validates the runtime shape and draft-filling contract. It does not validate final memory quality, Drive writeback, OAuth, real networked LLM distillation, or the visible browser UI.

The current deterministic filler is scaffolding and fallback for deployment readiness. The LLM lane is the intended high-quality distillation path when OpenAI is available.
