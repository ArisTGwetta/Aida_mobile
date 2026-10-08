# Private Character Packs

Generated or personal character art belongs in the authenticated Drive folder, not the public Git repository.

## Drive Pack Schema

Serana uses:

```json
{
  "schema": "aida_private_character_pack_v1",
  "id": "serana",
  "display_name": "Princess Serana",
  "visibility": "private_drive",
  "default_expression": "pensive",
  "expressions": {
    "coy": "aida_character_serana_coy.png",
    "pensive": "aida_character_serana_pensive.png",
    "wary": "aida_character_serana_wary.png"
  }
}
```

The manifest filename is `character_pack_serana.json`. Image files live beside it in Aida's configured private Drive folder.

## Serana Migration

Serana's nine portraits and manifest were copied into the local Google Drive mirror at `AIDA_ONE/json` and verified against the former Git copies with SHA-256 hashes before the public files were removed.

## Runtime Behavior

- System-stage images remain static and can render before OAuth.
- Private character images are advertised to the LLM only after their authenticated manifest loads.
- Character portraits are fetched as authenticated blobs and exposed only through temporary browser object URLs.
- If Drive or the character pack is unavailable, Director falls back to Aida's system stage rather than exposing or guessing a public character URL.
