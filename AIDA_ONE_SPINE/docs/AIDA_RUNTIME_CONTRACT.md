# AIDA Runtime Contract

All living modules must communicate through `window.AIDA_RUNTIME`.

No module may create a new source of truth for identity, memory, Drive tokens, OpenAI keys, current emotion, current role, current realm, or LLM messages.

## Runtime Shape

```js
window.AIDA_RUNTIME = {
  version: "spine-0.1",
  boot: {
    phase: "static_load",
    airlockCleared: false,
    driveConnected: false,
    driveLoaded: false,
    pyReady: false,
    mindReady: false,
    arrived: false,
    diagnostics: []
  },
  tokens: {
    openai: {
      key: null,
      fragments: null,
      source: null
    },
    drive: {
      accessToken: null,
      source: null
    }
  },
  drive: {
    folderId: null,
    files: {},
    syncQueue: [],
    lastSync: null
  },
  mind: {
    identity: null,
    memory: null,
    facts: null,
    insights: null,
    emotion: null,
    realm: null,
    role: null,
    projects: {},
    activeProject: null,
    session: null
  },
  context: {
    identity: null,
    realm: null,
    role: null,
    emotion: null,
    project: null,
    projectFacts: null,
    projectSummaries: null,
    tetrad: null,
    memoryWindow: null,
    llmMessages: null
  },
  py: {
    instance: null,
    organsMounted: {},
    ready: false
  },
  body: {
    currentFace: null,
    currentTheme: null,
    arrivalComplete: false
  },
  sleep: {
    lastActive: null,
    pendingJournal: [],
    whileAwaySeed: null
  }
};
```

## Module Join Contract

Every module must declare:

- `id`
- `phase`
- `reads`
- `writes`
- `requires`
- `verifies`

Example:

```js
window.AIDA_MODULES.register({
  id: "spine.drive.fetch",
  phase: "drive_memory_fetch",
  reads: ["tokens.drive.accessToken", "drive.folderId"],
  writes: ["drive.files", "mind.identity", "mind.memory"],
  requires: ["boot.driveConnected"],
  verifies: ["drive.files has loaded JSON names", "mind.identity is not null"]
});
```

## Naming Law

Use one name for each concept.

- OpenAI key: `AIDA_RUNTIME.tokens.openai.key`
- Drive token: `AIDA_RUNTIME.tokens.drive.accessToken`
- Raw Drive JSON: `AIDA_RUNTIME.drive.files`
- Active identity: `AIDA_RUNTIME.mind.identity`
- Active emotion: `AIDA_RUNTIME.mind.emotion`
- Active assembled context: `AIDA_RUNTIME.context`
- LLM messages: `AIDA_RUNTIME.context.llmMessages`

Legacy names are allowed only inside adapter modules and must be converted immediately.

## Airlock Law

The keypad is allowed to obscure the OpenAI key by assembling it from private fragments, but the fragments themselves must not be committed to the public/static processing code.

The airlock must:

- Accept zeros as decoy digits that do not affect fragment order.
- Require exactly three meaningful non-zero digits for the current scheme.
- Assemble the key only into `AIDA_RUNTIME.tokens.openai.key`.
- Store the assembled key only in session-scoped browser storage unless the user explicitly chooses another storage model.
- Fail closed if the private fragment provider is missing.

Development/private-local fragment provider:

- Local/private file: `spine/token_fragments.local.js`
- Example template: `spine/token_fragments.local.example.js`
- Runtime global: `window.AIDA_TOKEN_FRAGMENTS`

Production/mobile target:

- Google OAuth is cleared first.
- Drive issues an access token through the official Google Identity flow.
- Aida fetches private OpenAI fragments from the authenticated Drive vault.
- The keypad assembles the OpenAI key from `AIDA_RUNTIME.tokens.openai.fragments`.

The keypad must not assemble a Google token. The Drive token comes from Google OAuth, and the Google client ID is not a secret.

This is an obscurity layer for personal/private use, not cryptographic security. A future backend token broker is still the stronger security model for public deployment.

## Drive OAuth Law

Google Drive authentication must be owned by `spine/drive_oauth`.

The Drive OAuth module must:

- Load Google Identity Services once.
- Request OAuth through Google's official popup.
- Store the returned access token only in `AIDA_RUNTIME.tokens.drive.accessToken`.
- Mark `AIDA_RUNTIME.boot.driveConnected` only after a real OAuth token is returned.
- Use `AIDA_CONFIG.drive.jsonFolderId` as the private JSON folder target.

The Drive OAuth module must not:

- Assemble a Google token from keypad fragments.
- Treat the Google client ID as a secret.
- Fetch private JSON before OAuth succeeds.
- Write private Drive data outside `AIDA_RUNTIME.drive` and `AIDA_RUNTIME.mind`.

## LLM Law

The LLM may speak only after:

- Airlock is cleared.
- OpenAI key is present.
- Drive fetch has either succeeded or explicitly entered fallback mode.
- Python organs are mounted.
- Active context is assembled.
- Active realm/project state is resolved.
- Active role is resolved.
- Relevant facts and summaries for the active realm/project are loaded or explicitly marked unavailable.

The message builder must read from `AIDA_RUNTIME.context`, not from scattered globals.

Before any LLM call, the message builder must include:

- Core identity.
- Active realm.
- Active project or an explicit `no_active_project` marker.
- Active role.
- Current emotional state.
- Relevant facts.
- Relevant project/realm summaries.
- Recent session memory.
- Safety and boundary rules.

If a realm or project is active, its facts and summaries are authoritative context, not optional flavor.

## Fallback Law

Fallbacks are diagnostic survival tools, not Aida's normal mind.

Fallback state must:

- Be minimal.
- Be labeled.
- Never overwrite Drive-backed state.
- Never be treated as a successful full Aida boot.

## Sleep Law

Sleep is not optional. Every conversation loop must eventually support:

- Session append.
- Journal distillation.
- Fact/insight update candidates.
- Emotion persistence.
- Last-active persistence.
- While-away seed generation.
