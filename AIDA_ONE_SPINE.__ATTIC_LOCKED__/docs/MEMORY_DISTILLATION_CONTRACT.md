# Memory Distillation Contract

This is the working contract for turning Aida's raw interaction stream into useful memory.

The source model comes from the ONE tethered organs:

- `ONE/py/butler.py`: daily/nightly distillation and next-wake files.
- `ONE/py/librarian.py`: slower pattern recognition across summaries and history.
- `ONE/py/crawler.py`: archive indexing and retrieval over raw logs.

## Pipeline

```text
raw exchanges
  -> session log
  -> diary entry
  -> rolling short summary
  -> rolling long summary
  -> fact candidates
  -> insight candidates
  -> project/realm ledger updates
  -> LLM context + behavior guidance
```

Awake captures. Sleep distills. Deep meditation reviews.

## Layers

### Session Log

Source: `AIDA_RUNTIME.session.currentTurns`

Job:

- Preserve raw-ish exchanges with project, realm, role, emotion, route, and custom tags.
- Provide the audit trail for anything promoted later.
- Stay append-only until a sleep cycle safely stores it.

### Diary

Source: grouped session chunks and final sleep packet.

Job:

- Preserve the felt shape of the interaction.
- Include source references back to session/log IDs.
- Avoid becoming a facts file.

Example:

```json
{
  "id": "diary_20260606_session_...",
  "session_id": "session_...",
  "project": "cooking",
  "realm": "home",
  "emotional_shape": "practical, careful, lightly playful",
  "entry": "Francisco explored weeknight cooking constraints...",
  "source_turns": [1, 2, 3]
}
```

### Rolling Short Summary

Source: recent grouped exchanges.

Job:

- Keep the current local flow alive.
- Replace recent raw turns when the context window grows.
- Feed the LLM as near-term working memory.

### Rolling Long Summary

Source: diary entries, rolling short summaries, project ledger updates.

Job:

- Preserve durable project arc and standing context.
- Feed the LLM as long-term working memory.
- Stay project/realm scoped when possible.

### Facts

Facts are stable claims that Aida should treat as true unless contradicted or corrected.

Facts must have:

- `scope`: `global`, `project`, `realm`, or `user`
- `claim`
- `confidence`
- `source_refs`
- `status`: `active`, `candidate`, `needs_confirmation`, `retracted`
- `last_seen`

Example:

```json
{
  "id": "fact_user_food_dislikes_broccoli",
  "scope": "user",
  "claim": "Francisco does not like broccoli.",
  "confidence": 0.86,
  "source_refs": ["session_...#turn_4"],
  "status": "active",
  "last_seen": "2026-06-06T..."
}
```

### Insights

Insights are implications, patterns, or behavior guidance derived from facts, diary, and themes.

Insights must have:

- `scope`
- `derived_from`
- `guidance`
- `confidence`
- `status`
- `last_evaluated`

Example:

```json
{
  "id": "insight_cooking_avoid_broccoli",
  "scope": "project:cooking",
  "derived_from": ["fact_user_food_dislikes_broccoli"],
  "guidance": "Consider recipes that do not use broccoli, or offer substitutions when broccoli appears.",
  "confidence": 0.8,
  "status": "active",
  "last_evaluated": "2026-06-06T..."
}
```

Allergy example:

```json
{
  "id": "insight_cooking_check_allergens",
  "scope": "project:cooking",
  "derived_from": ["fact_user_food_allergies"],
  "guidance": "Check recipes for common allergens and call out unusual ingredients before recommending them.",
  "confidence": 0.95,
  "status": "active"
}
```

## Promotion Rules

Promote to fact when:

- The user explicitly states a preference, constraint, identity detail, project requirement, or real-world condition.
- The claim is specific enough to act on.
- The source turn is preserved.

Mark as `needs_confirmation` when:

- The claim is inferred.
- The wording is ambiguous.
- The claim is high impact, medical, legal, financial, identity-related, or safety-related.

Promote to insight when:

- A fact implies a recurring behavior change.
- Multiple diary entries show a stable pattern.
- A project repeatedly uses the same constraint, tone, or goal.

Do not promote:

- One-off moods.
- Jokes unless the user clearly frames them as durable.
- Speculation from Aida.
- While-away ambient curiosities.
- Fresh-glance headlines unless the user engages and the detail becomes relevant.

## Base Powers Backlog

### Aida's Glasses

Purpose:

- Accept images, screenshots, PDFs, and documents.
- Attach observations to the active project.
- Produce candidate facts, document notes, visual observations, and open questions.

Memory route:

```text
attachment -> observation notes -> project diary -> fact/insight candidates
```

### Remember

Purpose:

- Search diary, logs, rolling summaries, and fact/insight stores on request.
- Answer "do you remember..." with evidence.

Memory route:

```text
query -> diary/log/fact search -> cited recall -> optional correction/update
```

### Meditation

Purpose:

- Review stored logs/sleep packets for details that did not reach diary, facts, or insights.
- Identify missed facts, weak summaries, unresolved threads, and recurring patterns.

Memory route:

```text
logs + diary + summaries -> missed detail candidates -> facts/insights/project updates
```

### Fresh Glance Feed

Purpose:

- Give Aida honest access to subject-relevant current headlines or feed items.
- Let while-away mention current items only when a real feed item exists.

Memory route:

```text
feed item -> while-away mention -> user response -> engagement signal -> source/topic preference
```

## Sleep Responsibilities

Sleep should eventually:

- Append session logs.
- Create diary entries.
- Fill rolling short summaries.
- Update rolling long summaries.
- Stage fact candidates.
- Stage insight candidates.
- Stage project/realm ledger updates.
- Capture emotion snap logs and face wishlist signals.
- Capture while-away topic engagement.

Sleep should not blindly overwrite facts or insights. High-impact or ambiguous candidates should wait for confirmation.

## LLM Context Use

Awake LLM context should include:

- Active identity.
- Active realm/project/role.
- Current emotion.
- Recent turns.
- Rolling short summary.
- Rolling long summary.
- Relevant facts.
- Relevant insights.
- Current while-away reentry script when applicable.

Facts tell Aida what is true. Insights tell Aida how to act on what is true.
