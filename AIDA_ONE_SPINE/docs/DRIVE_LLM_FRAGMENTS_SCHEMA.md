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
