# Spotify now-playing marquee

**Date:** 2026-09-13
**Status:** Approved, pending implementation plan

## Goal

Add a live "now playing" marquee in LED/dot-matrix style directly under the Wi-Fi password
in the featured column of the main menu. When music is playing on the shop's Spotify, it
scrolls `Now playing: {title} — {artist}`; otherwise it shows `♪ Nothing playing`.

## Decisions (confirmed with user)

| Decision | Choice |
|---|---|
| Placement | A persistent line **under** the Wi-Fi password (no cycling / alternation) |
| Playing text | `Now playing: {title} — {artist}` |
| Idle / unreachable text | `♪ Nothing playing` |
| Font | **DotGothic16** (Google Font, dot-matrix LED look), marquee scroll R→L, seamless loop |
| Data source | Live Spotify Web API at runtime (Worker route + client polling), NOT build-time/cron |
| Auth | Spotify app + one-time authorization → refresh token; stored as Worker secrets |
| Fail mode | Fail-closed: any error / no secrets / nothing playing → placeholder, never a 500 |

## Architecture

Now-playing changes every few minutes, so it cannot be baked at build time or by the 20-min
cron. It requires runtime data: a Worker API route that talks to Spotify, and a client that
polls it. This mirrors the existing `/api/version` + `AutoRefresh` polling pattern.

### 1. Spotify auth (user, one-time)

- Create a Spotify app at developer.spotify.com → `client ID` + `client secret`.
- Authorize once (Authorization Code flow, scope `user-read-currently-playing`) to obtain a
  **refresh token**. A tiny one-time helper script + exact steps are delivered as part of the
  work (`scripts/spotify-refresh-token.md` or a short node script) so the user can produce the
  token locally.
- Add three secrets to the GitHub **production** environment (same place as the Cloudflare and
  Square secrets):
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`
  - `SPOTIFY_REFRESH_TOKEN`

These must also be available to the deployed Worker at runtime (Wrangler secrets on the
Worker), not only to CI. The plan pins exactly how (see Risk).

### 2. Worker route — `app/api/now-playing/route.ts`

- `export const dynamic = "force-dynamic";`, response `cache-control: no-store` (like
  `/api/version`).
- Steps: refresh-token → access-token (POST `https://accounts.spotify.com/api/token`,
  `grant_type=refresh_token`, Basic auth of client id:secret) → GET
  `https://api.spotify.com/v1/me/player/currently-playing`.
- Returns minimal JSON: `{ playing: boolean, title: string | null, artist: string | null }`.
  - `is_playing === true` with an item → `{ playing: true, title, artist }` (artist = joined
    artist names).
  - HTTP 204 (nothing playing), paused, missing secrets, or any thrown error → `{ playing: false, title: null, artist: null }`.
- **Never throws to a 500** — every failure path returns `{ playing: false }` so the board
  degrades to the placeholder.

### 3. Client — `app/components/NowPlaying.tsx` (`"use client"`)

- Polls `/api/now-playing` with `{ cache: "no-store" }` every 20s; sets state
  `{ playing, title, artist }`. Ignores transient fetch errors (keeps last state, or falls to
  placeholder).
- Renders:
  - Playing → marquee text `Now playing: {title} — {artist}`.
  - Not playing → `♪ Nothing playing`.
- Marquee: a track container animates `transform: translateX` from `0` to `-50%` over a
  duration scaled to text length, looping infinitely; the text is duplicated twice inside the
  track so the loop is seamless. Respects the LED font.
- One `setInterval`, cleared on unmount.

### 4. Font — `app/layout.tsx`

Add `DotGothic16` to the existing Google Fonts `<link>` (append `&family=DotGothic16` to the
`css2` URL). No new mechanism.

### 5. Placement — `app/components/Featured.tsx`

Render `<NowPlaying />` immediately after the `.wifi` line, before the "On espresso bar"
section. `NowPlaying` (client) is a child of `Featured` (server) — allowed. Featured still
returns `null` when there's no espresso-of-the-day image (existing behavior unchanged); the
now-playing line lives inside that column.

## Styling

- New scoped classes in `menu.module.css` (the featured column already lives there):
  - `.nowPlaying` — the LED line: `font-family: "DotGothic16", monospace;`, size ~= the wifi
    line, `overflow: hidden; white-space: nowrap;`, subtle LED tint/glow optional.
  - `.nowPlayingTrack` — the moving inner element with the duplicated text and the marquee
    keyframes.
- Keep white-on-black to match the board; the dot-matrix font carries the LED read.

## Risk (pin FIRST during implementation)

The existing `/api/version` route only reads a **build-time** define (`__BUILD_ID__`), never a
runtime secret. It is unverified how a vinext route handler reads **runtime Cloudflare Worker
secrets** (`env` bindings vs `process.env` shim vs `cloudflare:workers`). Task 1 of the plan
must determine and prove this with a throwaway check before the real route is built. If runtime
secrets are not cleanly reachable in a route handler, the approach changes (e.g. read them in
`worker/index.ts` and pass through) — surface that immediately rather than guessing.

## Verification

- With no Spotify secrets: `/api/now-playing` returns `{ playing: false }`; the board shows
  `♪ Nothing playing`; `pnpm build` green; no runtime errors.
- With valid secrets + a track playing: the route returns `{ playing: true, title, artist }` and
  the marquee scrolls the track.
- Paused / nothing playing → placeholder.
- Killing network / bad token → placeholder, board never 500s.

## Out of scope (YAGNI)

- Album art, progress bar, playback controls, like/track history.
- Multiple music services; multiple simultaneous now-playing sources.
- Changing when the featured column renders (still gated on the espresso-of-the-day image).
- Caching/rate-limit tuning beyond `no-store` + 20s polling (Spotify limits are ample for one
  kiosk).
