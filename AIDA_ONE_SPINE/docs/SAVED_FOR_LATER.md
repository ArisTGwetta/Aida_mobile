# Saved For Later

Small design and implementation notes we intentionally postponed so the spine work can keep moving.

## Awake Body Pixel Grid Tuning

Status: later tuning, not blocking.

Current effect: two overlay grids on Aida's face, one slow/larger and one fast/finer, suggesting living data/pixels.

Desired future feel:

- Much brighter, closer to the bright pixel/spark values already present in the static portrait.
- Much slower, potentially 10x to 100x slower than the first pass.
- Less like an active screen overlay.
- More like the static squares that are already part of the image might themselves blink out at any moment.
- The emotional impression should be quiet instability/living connection, not busy animation.

Current knobs are in `body/awake.js`:

```js
buildFaceDataGrid("face-data-slow", 120, [4200, 8600], [0.18, 0.42]);
buildFaceDataGrid("face-data-fast", 396, [900, 2600], [0.12, 0.36]);
```

Possible later direction:

```js
buildFaceDataGrid("face-data-slow", 120, [45000, 140000], [0.55, 0.95]);
buildFaceDataGrid("face-data-fast", 396, [20000, 70000], [0.35, 0.75]);
```

## Token Security Upgrade

Status: later security architecture, before public/mobile deployment.

Current development path:

- Local/private fragment file can support the keypad during local work.
- The file is ignored by git and must not be published.

Preferred AIDA-One target:

- Google OAuth happens first and provides the Drive access token.
- Private OpenAI fragments live in Drive, not GitHub.
- After OAuth, Aida fetches the fragments from Drive into `AIDA_RUNTIME.tokens.openai.fragments`.
- The keypad assembles the OpenAI key from those Drive-loaded fragments.
- The assembled key exists only in runtime/session storage.

Important distinction:

- The keypad does not assemble a Google token.
- Google OAuth issues the Drive token.
- The keypad is for the OpenAI key ceremony/obscurity layer after Drive authentication.

Longer-term stronger model:

- Use a private Cloud Run / Cloud Function token broker or OpenAI proxy.
- Browser never receives a long-lived OpenAI key.

## Keypad Route Shortcuts

Status: partially supported in airlock schema; tune after LLM provider layer exists.

Idea:

- `123` could open normal Aida.
- `789` could open debug mode.
- `456` could choose an alternate roleplay-oriented provider.

The keypad remains useful as a shortcut doorway even after in-app provider switching exists.
