# Hosting And OAuth Test

Google OAuth will reject `file://` pages. AIDA-One Drive authentication must be tested from an approved HTTPS origin.

## Expected GitHub Pages URL

If this repo is published through GitHub Pages from the `main` branch, the likely test URL is:

```text
https://aristgwetta.github.io/Aida_mobile/AIDA_ONE_SPINE/drive_oauth_test.html
```

If the GitHub Pages settings use a custom domain or a different branch/folder, use that published URL instead.

## Google Cloud OAuth Settings

In the Google Cloud console for the Aida Mobile OAuth client, add the GitHub Pages origin as an authorized JavaScript origin:

```text
https://aristgwetta.github.io
```

Important:

- JavaScript origins use only scheme + host + optional port.
- Do not include `/Aida_mobile/...` in the authorized JavaScript origin.
- The client ID is not a secret.
- The Drive access token must still come from the official Google OAuth popup.

## Test Flow

1. Push `AIDA_ONE_SPINE/drive_oauth_test.html` to the GitHub repo.
2. Open the GitHub Pages URL.
3. Click `Connect Drive`.
4. Authenticate as the authorized Google user.
5. Click `List JSON Files`.

Success looks like:

```text
>>> Google OAuth client ready.
>>> Requesting Google Drive token...
>>> OAuth cleared. Drive token is available in memory.
>>> Found N JSON files.
```

If the page still fails, check:

- The browser is on `https://`, not `file://`.
- The origin in the browser matches an authorized JavaScript origin in Google Cloud.
- The OAuth consent screen allows the Google account being used.
- The Drive folder ID in `spine/config.js` matches the private Aida JSON folder.

## Private Fragment File

`spine/token_fragments.local.js` is intentionally ignored and should not exist on GitHub Pages.

The hosted app should not request that file. Local OpenAI fragments are only a development fallback; the intended hosted flow is:

```text
Google OAuth -> fetch private Drive JSON/fragments -> keypad assembles OpenAI key
```
