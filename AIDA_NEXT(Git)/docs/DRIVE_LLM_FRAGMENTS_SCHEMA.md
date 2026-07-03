# Drive LLM Fragments Schema

Private LLM key fragments should live in Drive, not GitHub.

Recommended filename:

```text
llm_fragments.json
```

The keypad uses the three meaningful non-zero digits as a route. Zeros remain decoys.

Example:

```json
{
  "routes": {
    "123": {
      "label": "Normal Aida",
      "provider": "openai",
      "profile": "normal",
      "prefix": "sk-proj-",
      "segments": {
        "1": "fragment-a",
        "2": "fragment-b",
        "3": "fragment-c"
      }
    },
    "321": {
      "label": "Debug Aida",
      "provider": "openai",
      "profile": "debug",
      "prefix": "sk-proj-",
      "segments": {
        "3": "fragment-a",
        "2": "fragment-b",
        "1": "fragment-c"
      }
    },
    "456": {
      "label": "Grok Director",
      "provider": "xai",
      "profile": "grok-roleplay",
      "model": "grok-4.3",
      "prefix": "xai-",
      "segments": {
        "4": "fragment-a",
        "5": "fragment-b",
        "6": "fragment-c"
      }
    },
    "789": {
      "label": "Local Private Aida",
      "provider": "ollama",
      "profile": "private-local",
      "model": "llama3:latest",
      "auth": "none",
      "endpoint": "http://127.0.0.1:11434/v1/responses"
    }
  }
}
```

Notes:

- The route can choose provider/profile as well as assemble a key.
- Supported provider values are `openai`, `xai` (or the alias `grok`), and `ollama`.
- OpenAI and xAI always use their fixed official API endpoints. A route cannot redirect their bearer keys.
- Ollama routes use `auth: "none"` and do not need `prefix` or `segments`.
- Ollama may set a local `endpoint`; the default is `http://127.0.0.1:11434/v1/responses`.
- A route may set its `model`; otherwise the provider default from `spine/config.js` is used.
- The assembled key is stored in `AIDA_RUNTIME.tokens.llm.key`.
- The selected provider/profile are stored in `AIDA_RUNTIME.tokens.llm.provider` and `AIDA_RUNTIME.tokens.llm.profile`.
- The current keypad requires exactly three meaningful non-zero digits.
- This is still personal/private obscurity, not cryptographic security.
- The route inspector may show `pin`, `label`, `provider`, and `profile`, but must never print segment values.

## First Test Recommendation

Start with one route only:

```json
{
  "routes": {
    "123": {
      "label": "Normal Aida",
      "provider": "openai",
      "profile": "normal",
      "prefix": "sk-proj-",
      "segments": {
        "1": "first-real-fragment",
        "2": "second-real-fragment",
        "3": "third-real-fragment"
      }
    }
  }
}
```

Upload that as `llm_fragments.json` in the same Drive JSON folder.

## Hosted Test Flow

After committing and pushing the updated spine:

1. Open `https://aristgwetta.github.io/Aida_mobile/AIDA_ONE_SPINE/index.html`.
2. Click `Connect Drive` and clear Google OAuth.
3. Click `Fetch Drive JSON`.
4. Click `Inspect Context`.
5. Confirm the log says `LLM ROUTES: fragments=true, routes=1, selected=none/none, keyReady=false`.
6. Click `Begin Airlock`.
7. Confirm the log prints route metadata only, such as `123 -> Normal Aida (openai/normal)`.
8. Enter `123` on the keypad. Zeros may be mixed in as decoys, such as `100020003`.
9. Press `OK`.
10. Confirm the log says the route was assembled into the runtime token vault.
11. Return to BIOS and click `Inspect Context` again.
12. Confirm the log shows the selected provider/profile. Hosted routes report `keyReady=true`; Ollama is ready without a key.

Do not test by printing `AIDA_RUNTIME.tokens.llm.key`; that would expose the assembled private key.
