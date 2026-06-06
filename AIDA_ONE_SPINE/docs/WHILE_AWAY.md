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
AIDA_RUNTIME.sleep.whileAwayScript
AIDA_RUNTIME.sleep.whileAwaySeeds
AIDA_RUNTIME.sleep.whileAwayTestGap
```

## Current Rules

- Generate at most one thought during wake.
- Keep complexity small.
- Prefer `while_away_thoughts.json`.
- Fall back to insights, then memory summary, then a clearly small fallback.
- Do not say Aida was sad, lonely, abandoned, or waiting helplessly.
- Do not claim real external browsing or real-world action unless a future tool actually did it.
- Do not write Drive yet.

## Reentry Script

The spine version adapts the older `ONE/js/050-while_away_gold.js` idea without requiring Pyodide.

Each prepared thought now includes:

```json
{
  "gap_bucket": "just_now | same_moment | same_day | same_day_long | short_gap | long_gap | unknown",
  "opening_mode": "hello_only | soft_return | small_curiosity | returning_thread | held_thread | treasure_box",
  "selected_mode": "reflection | curiosity | discovery | interest | user_curiosity",
  "seed_topic": {
    "type": "private_thought | curiosity | interest | project_thread | insight | memory | face_wishlist | fallback",
    "tone": "curious",
    "summary": "short safe topic",
    "source_text": "bounded source excerpt"
  }
}
```

The mode set comes from the older support organ/Python generator:

- `reflection`
- `curiosity`
- `discovery`
- `interest`
- `user_curiosity`

The script is stored at `AIDA_RUNTIME.sleep.whileAwayScript` for inspection and future LLM-assisted phrasing.

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

Useful console check:

```js
AIDA_WHILE_AWAY.buildThought()
AIDA_RUNTIME.sleep.whileAwayScript
AIDA_RUNTIME.sleep.whileAway
```

Testing gap buckets without altering Drive:

```js
AIDA_WHILE_AWAY.setTestGap("long_gap")
AIDA_WHILE_AWAY.buildThought()
AIDA_RUNTIME.sleep.whileAwayScript
AIDA_WHILE_AWAY.clearTestGap()
```

Or simulate an exact time away:

```js
AIDA_WHILE_AWAY.buildThought({ gap: { minutes: 60 * 24 * 21 } })
```
