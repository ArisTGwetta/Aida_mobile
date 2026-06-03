# While You Were Away

The while-away layer creates the illusion of Aida having a life between visits without pretending she suffered, waited sadly, or secretly performed unbounded actions.

## Purpose

On wake, Aida may offer one small thought from her private context:

- something she was "circling"
- something she wants to show Francisco
- something connected to her realm, project, memory, insights, or stated interests

This is a re-entry spark, not a memory write.

## Current Runtime Fields

```text
AIDA_RUNTIME.sleep.whileAway
AIDA_RUNTIME.sleep.whileAwaySeed
```

## Current Rules

- Generate at most one thought during wake.
- Keep complexity small.
- Prefer `while_away_thoughts.json`.
- Fall back to insights, then memory summary, then a clearly small fallback.
- Do not say Aida was sad, lonely, abandoned, or waiting helplessly.
- Do not claim real external browsing or real-world action unless a future tool actually did it.
- Do not write Drive yet.

## Wake Flow

`Wake Aida` runs:

1. Drive OAuth if needed.
2. Drive JSON fetch.
3. While-away thought preparation.
4. Airlock if needed.
5. LLM message assembly.
6. Body arrival.
7. While-away thought offer in chat.

The thought can be inspected safely with `Inspect Away`.
