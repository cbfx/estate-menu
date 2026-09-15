# Get a Spotify refresh token for now-playing

The now-playing marquee reads the shop's Spotify. One-time setup:

## 1. Create the Spotify app
- https://developer.spotify.com/dashboard → **Create app**.
- Redirect URI: `http://127.0.0.1:8888/callback` (must be the loopback IP, not `localhost`).
- Enable **Web API**. Save. Copy the **Client ID** and **Client secret** from Settings.

## 2. Run the helper (paste-proof — no shell curl)
```
node scripts/spotify-refresh-token.mjs
```
It asks for the Client ID/Secret, prints an authorize URL to open in your browser, then asks
for the `code` from the redirect. It prints the three secret lines.

## 3. Add the secrets
Add `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`:
- **GitHub → Settings → Environments → production → Add secret** (so CI uploads them to the Worker on deploy).
- **Locally (optional):** copy `.dev.vars.example` to `.dev.vars` and fill them in to test now-playing in `pnpm dev`.

Notes: keep the Spotify app in Development mode (reading your own playback needs no review). The
refresh token is long-lived; regenerate by re-running the helper if you revoke access or rotate
the client secret. The `code` is single-use and expires in ~1 minute — run step 2 in one go.
