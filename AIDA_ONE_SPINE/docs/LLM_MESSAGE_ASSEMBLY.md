# LLM Message Assembly

The first LLM organ is a preflight builder. It assembles the message packet in runtime but does not call the API.

Runtime outputs:

```text
AIDA_RUNTIME.context.tetrad
AIDA_RUNTIME.context.llmMessages
```

## Tetrad Purpose

The tetrad is the routing lens for the LLM call. It is not a second personality template and it is not a wall of guardrails.

The four sides are:

- `identity`: who is speaking.
- `arena`: which realm/project this turn belongs to.
- `role`: what job or hat Aida is wearing.
- `state`: current emotion, memory pressure, and active LLM route.

## Cascade

The message builder uses this order:

1. Resolve active runtime context from Drive-loaded mind state.
2. Build the tetrad.
3. Build one system message from identity, realm/project, role, emotion, facts, memory, insights, session, and recent turns.
4. Add the current user message, or a preflight placeholder if no user text exists.
5. Store the packet in `AIDA_RUNTIME.context.llmMessages`.
6. Log only safe counts/names in BIOS.

## Current Button

`Build LLM Messages` runs the builder and logs a safe summary.

It should happen after:

- Drive JSON fetch succeeds.
- Context inspection passes.
- Airlock/key assembly succeeds.

No API call is made at this stage.

## First Live Call

`spine/llm_openai.js` owns the first live OpenAI call.

It must refuse to send unless:

- Drive JSON has been fetched.
- Airlock is cleared.
- `AIDA_RUNTIME.tokens.llm.key` is present.
- The active route is OpenAI.
- `AIDA_RUNTIME.context.llmMessages` is ready.

The first live call displays one response in the body chat. It does not write memory, update facts, run sleep routines, or sync Drive.
