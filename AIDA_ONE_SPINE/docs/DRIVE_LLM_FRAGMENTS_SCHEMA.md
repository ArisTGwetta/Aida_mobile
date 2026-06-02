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
    "789": {
      "label": "Debug Aida",
      "provider": "openai",
      "profile": "debug",
      "prefix": "sk-proj-",
      "segments": {
        "7": "fragment-a",
        "8": "fragment-b",
        "9": "fragment-c"
      }
    },
    "456": {
      "label": "Alternate Roleplay Provider",
      "provider": "alternate",
      "profile": "roleplay",
      "prefix": "",
      "segments": {
        "4": "fragment-a",
        "5": "fragment-b",
        "6": "fragment-c"
      }
    }
  }
}
```

Notes:

- The route can choose provider/profile as well as assemble a key.
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
12. Confirm the log says `selected=openai/normal, keyReady=true`.

Do not test by printing `AIDA_RUNTIME.tokens.llm.key`; that would expose the assembled private key.
