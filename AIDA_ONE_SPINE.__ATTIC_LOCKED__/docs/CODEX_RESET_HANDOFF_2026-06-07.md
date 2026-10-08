# Codex Reset Handoff - 2026-06-07

Use this if Codex is restarted, repaired, or reinstalled while debugging the Windows sandbox/process launch issue.

## Current State

- Aida lives in `C:\Users\arist\OneDrive\Documents\GitHub\Aida_mobile`.
- Main working app path is `AIDA_ONE_SPINE/index.html`.
- Mobile boot lazy-load is working much better: phone load was reported around 45 seconds.
- Sleep cycle exists and collects packets in runtime without Drive writes.
- While-away reentry exists, has test gap helpers, and is intentionally grounded/honest.
- Memory architecture notes exist in `docs/MEMORY_DISTILLATION_CONTRACT.md`.
- Architect-Companion default emotion was softened from `focused` to `happy`.

## Most Recent Code Change

- `AIDA_ONE_SPINE/spine/emotion_engine.js`
  - `architect-companion` and `architect_companion` default to `happy`.
  - `aida_architecture` realm default also changed to `happy`.
  - Compliance/protocol defaults remain `focused`.
- `AIDA_ONE_SPINE/index.html`
  - `emotion_engine.js` cache tag bumped to `v=20260607a`.

Expected log after reload/deploy:

```text
EMOTION: happy applied face=happy1.png source=project_context ...
```

## Codex Sandbox Issue

Observed failure for normal sandboxed shell commands:

```text
windows sandbox: runner error: CreateProcessAsUserW failed: 5
```

Important observations:

- Sandboxed shell launch fails globally, even from temp/home.
- Escalated shell commands work.
- Bundled Node itself works outside sandbox:

```text
C:\Users\arist\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe -v
v24.14.0
```

- Controlled Folder Access reported disabled.
- Defender/AppLocker did not show an obvious block.
- Likely issue: Codex sandbox/helper process launch permission, not the repo and not Node itself.

Important process paths seen:

```text
C:\Program Files\WindowsApps\OpenAI.Codex_26.602.4764.0_x64__2p2nqsd0c76g0\app\Codex.exe
C:\Program Files\WindowsApps\OpenAI.Codex_26.602.4764.0_x64__2p2nqsd0c76g0\app\resources\codex.exe
C:\Program Files\WindowsApps\OpenAI.Codex_26.602.4764.0_x64__2p2nqsd0c76g0\app\resources\node.exe
C:\Users\arist\AppData\Local\OpenAI\Codex\bin\fb2111b91430cb17\codex.exe
C:\Users\arist\AppData\Local\OpenAI\Codex\bin\34ab3e1324cc55b5\node_repl.exe
```

After any reset/reinstall, first test:

```powershell
Write-Output "shell-ok"
```

without escalation.

## Recommended Next Product Work

1. Verify the softer Architect-Companion default on boot and project switch.
2. Continue awake-side polish only if needed.
3. Start sleep-side memory distillation:
   - raw exchanges
   - diary entry
   - rolling short summary
   - rolling long summary
   - fact candidates
   - insight candidates
   - project/realm ledger updates
4. Add key future powers to backlog/implementation design:
   - Aida's Glasses: images, PDFs, docs, screenshots.
   - Remember: search diary/logs/facts on request.
   - Meditation: review logs/sleep packets for missed details.
   - Fresh Glance Feed: honest current external feed items and engagement tracking.

