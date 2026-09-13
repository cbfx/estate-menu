# Spotify Now-Playing Marquee Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a live LED/dot-matrix marquee under the Wi-Fi password that scrolls the Spotify now-playing track, falling back to a placeholder when nothing is playing.

**Architecture:** A Cloudflare Worker route (`app/api/now-playing`) refreshes a Spotify access token and returns minimal `{ playing, title, artist }`; a client component polls it every 20s and renders a marquee in the DotGothic16 font. Pure Spotify-response parsing is isolated and unit-tested. Runtime secrets reach the route via `process.env` (Cloudflare `nodejs_compat`), supplied by `.dev.vars` locally and by `cloudflare/wrangler-action` secrets in CI.

**Tech Stack:** vinext (Vite + React 19, App Router), Cloudflare Workers, Node built-in `fetch` + `node --test`, DotGothic16 (Google Font), CSS marquee.

## Global Constraints

- Package manager: **pnpm**. Vite stays **8.x**.
- Runtime secrets read via **`process.env.SPOTIFY_*`** in the route handler (Cloudflare `nodejs_compat` surfaces vars/secrets there — same mechanism `worker/index.ts` uses for `process.env.__VINEXT_IMAGE_*`). Never import secrets into client code.
- Secret names, verbatim: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`.
- `/api/now-playing`: `export const dynamic = "force-dynamic"`, response header `cache-control: no-store`.
- **Fail-closed:** missing secrets, HTTP 204, paused, or ANY thrown error → `{ playing: false, title: null, artist: null }`. The route never returns 5xx.
- Playing text: `Now playing: {title} — {artist}`. Idle/unreachable text: `♪ Nothing playing`.
- Marquee font: **DotGothic16**, added to the existing Google Fonts `<link>` in `app/layout.tsx`.
- Client polls every **20s** with `{ cache: "no-store" }`; one interval, cleared on unmount.
- Featured column still renders only when there's an espresso-of-the-day image (unchanged).
- Known pre-existing `tsc` noise: 4 errors (3 `.next/types/validator.ts`, 1 `Fetcher` `worker/index.ts`). Gate = no NEW errors beyond those 4.
- Secrets files (`.dev.vars`, `.env*`) are already git-ignored — never commit real tokens.

**Working directory:** `/Users/cbfx/code/cbfx/estate-menu` (git repo, branch `add-raja-special-menu`). `pnpm dev` → http://localhost:3000 (the `dev` script binds `-H 0.0.0.0`).

---

### Task 1: Parse now-playing response (pure logic, TDD)

Pure function turning a Spotify `currently-playing` body into the minimal UI shape. No network, no secrets.

**Files:**
- Create: `app/api/now-playing/parse.ts`
- Test: `app/api/now-playing/parse.test.mjs`

**Interfaces:**
- Produces: `type NowPlaying = { playing: boolean; title: string | null; artist: string | null }`
- Produces: `parseNowPlaying(body: unknown): NowPlaying` — playing only when `is_playing===true`, an `item` exists, a string `name`, and ≥1 artist name; else all-off.

- [ ] **Step 1: Write the failing test `app/api/now-playing/parse.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNowPlaying } from "./parse.ts";

const OFF = { playing: false, title: null, artist: null };

test("parses a playing track with one artist", () => {
  const body = { is_playing: true, item: { name: "Redbone", artists: [{ name: "Childish Gambino" }] } };
  assert.deepEqual(parseNowPlaying(body), { playing: true, title: "Redbone", artist: "Childish Gambino" });
});

test("joins multiple artists with a comma", () => {
  const body = { is_playing: true, item: { name: "Song", artists: [{ name: "A" }, { name: "B" }] } };
  assert.equal(parseNowPlaying(body).artist, "A, B");
});

test("not playing when is_playing is false", () => {
  assert.deepEqual(parseNowPlaying({ is_playing: false, item: { name: "x", artists: [{ name: "y" }] } }), OFF);
});

test("not playing when there is no item", () => {
  assert.deepEqual(parseNowPlaying({ is_playing: true, item: null }), OFF);
});

test("safe on null/empty/garbage bodies", () => {
  assert.deepEqual(parseNowPlaying(null), OFF);
  assert.deepEqual(parseNowPlaying(undefined), OFF);
  assert.deepEqual(parseNowPlaying({}), OFF);
  assert.deepEqual(parseNowPlaying({ is_playing: true, item: { name: "x" } }), OFF); // no artists
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `node --test app/api/now-playing/parse.test.mjs`
Expected: FAIL (cannot find module `./parse.ts`). Node here runs `.ts` imports via native type-stripping (as `app/events/schedule.test.mjs` already does).

- [ ] **Step 3: Create `app/api/now-playing/parse.ts`**

```ts
export type NowPlaying = {
  playing: boolean;
  title: string | null;
  artist: string | null;
};

const OFF: NowPlaying = { playing: false, title: null, artist: null };

export function parseNowPlaying(body: unknown): NowPlaying {
  if (!body || typeof body !== "object") return OFF;
  const b = body as { is_playing?: unknown; item?: unknown };
  if (b.is_playing !== true || !b.item || typeof b.item !== "object") return OFF;
  const item = b.item as { name?: unknown; artists?: unknown };
  const title = typeof item.name === "string" ? item.name : null;
  const artists = Array.isArray(item.artists)
    ? item.artists
        .map((a) => (a && typeof a === "object" ? (a as { name?: unknown }).name : null))
        .filter((n): n is string => typeof n === "string")
    : [];
  if (!title || artists.length === 0) return OFF;
  return { playing: true, title, artist: artists.join(", ") };
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `node --test app/api/now-playing/parse.test.mjs`
Expected: PASS — 5 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add app/api/now-playing/parse.ts app/api/now-playing/parse.test.mjs
git commit -m "feat: parse Spotify now-playing response (pure, tested)"
```

---

### Task 2: The now-playing route + runtime secret access

The Worker route that mints an access token from the refresh token, calls Spotify, returns the parsed result. Also **pins the runtime-secret mechanism** (the spec's flagged risk) using a local `.dev.vars`.

**Files:**
- Create: `app/api/now-playing/route.ts`
- Create: `.dev.vars.example`

**Interfaces:**
- Consumes: `parseNowPlaying` from `./parse`.
- Produces: `GET /api/now-playing` → JSON `{ playing, title, artist }`, `cache-control: no-store`.

- [ ] **Step 1: Create `app/api/now-playing/route.ts`**

```ts
import { parseNowPlaying } from "./parse";

export const dynamic = "force-dynamic";

const OFF = { playing: false, title: null, artist: null };

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function getAccessToken(id: string, secret: string, refresh: string): Promise<string | null> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: "Basic " + btoa(`${id}:${secret}`),
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export async function GET() {
  try {
    const id = process.env.SPOTIFY_CLIENT_ID;
    const secret = process.env.SPOTIFY_CLIENT_SECRET;
    const refresh = process.env.SPOTIFY_REFRESH_TOKEN;
    if (!id || !secret || !refresh) return json(OFF);

    const token = await getAccessToken(id, secret, refresh);
    if (!token) return json(OFF);

    const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.status === 204 || !res.ok) return json(OFF); // 204 = nothing playing

    const body = await res.json();
    return json(parseNowPlaying(body));
  } catch {
    return json(OFF);
  }
}
```

- [ ] **Step 2: Create `.dev.vars.example`**

```
# Copy to .dev.vars (git-ignored) and fill in real values from your Spotify app.
# See scripts/spotify-refresh-token.md to obtain the refresh token.
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=
```

- [ ] **Step 3: Prove fail-closed with NO secrets**

```bash
rm -f .dev.vars
pkill -9 -f vinext 2>/dev/null; sleep 2
nohup pnpm dev >/tmp/np.log 2>&1 &
sleep 12
echo "body:"; curl -sS http://127.0.0.1:3000/api/now-playing; echo
echo "status:"; curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/now-playing
pkill -9 -f vinext 2>/dev/null
```
Expected: body is `{"playing":false,"title":null,"artist":null}`, status `200`. (No secrets → fail-closed, not an error.)

- [ ] **Step 4: Prove runtime secret access works (the risk-pin)**

Write a temporary `.dev.vars` with a deliberately BOGUS token set, restart dev, and confirm the route still returns `{ playing:false }` at status 200 (bogus creds → token refresh fails → OFF), proving `process.env` is read at runtime without crashing:

```bash
printf 'SPOTIFY_CLIENT_ID=bogus\nSPOTIFY_CLIENT_SECRET=bogus\nSPOTIFY_REFRESH_TOKEN=bogus\n' > .dev.vars
pkill -9 -f vinext 2>/dev/null; sleep 2
nohup pnpm dev >/tmp/np.log 2>&1 &
sleep 12
echo "body:"; curl -sS http://127.0.0.1:3000/api/now-playing; echo
echo "status:"; curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/now-playing
pkill -9 -f vinext 2>/dev/null
rm -f .dev.vars
```
Expected: body `{"playing":false,...}`, status `200`, and `/tmp/np.log` shows no unhandled error. If instead the secrets are NOT visible on `process.env` (route behaves identically whether or not `.dev.vars` exists AND you cannot otherwise confirm access), STOP and report — the secret-access mechanism needs revisiting before proceeding (e.g. reading env off the request/worker context instead of `process.env`). Note in the report which was observed.

- [ ] **Step 5: Verify build + no new tsc errors**

```bash
pnpm build >/tmp/b.log 2>&1 && echo BUILD_OK || tail -12 /tmp/b.log
pnpm exec tsc --noEmit 2>&1 | grep -viE "validator.ts|Fetcher|worker/index.ts" | grep -cE "error TS"
```
Expected: `BUILD_OK` and `0` new tsc errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/now-playing/route.ts .dev.vars.example
git commit -m "feat: /api/now-playing route (fail-closed, runtime secrets via process.env)"
```

---

### Task 3: Client marquee + font + placement

The polling client component, the LED marquee styles, the DotGothic16 font, and wiring it under the Wi-Fi line.

**Files:**
- Create: `app/components/NowPlaying.tsx`
- Modify: `app/menu.module.css` (marquee styles)
- Modify: `app/layout.tsx` (add DotGothic16 to the font link)
- Modify: `app/components/Featured.tsx` (render `<NowPlaying />` under `.wifi`)

**Interfaces:**
- Consumes: `GET /api/now-playing` → `{ playing, title, artist }`.
- Produces: default `NowPlaying` component (no props).

- [ ] **Step 1: Add DotGothic16 to the font link in `app/layout.tsx`**

Change the existing DM Sans `<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap" ... />` to also request DotGothic16:

```tsx
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=DotGothic16&display=swap"
          rel="stylesheet"
        />
```
(Leave the two `preconnect` links unchanged.)

- [ ] **Step 2: Add marquee styles to `app/menu.module.css`** (append near the other `.featured`/`.wifi` rules)

```css
.nowPlaying {
  font-family: "DotGothic16", monospace;
  font-size: 26px;
  line-height: 1.4;
  color: #ffffff;
  overflow: hidden;
  white-space: nowrap;
  width: 100%;
}

.nowPlayingTrack {
  display: inline-block;
  white-space: nowrap;
  will-change: transform;
  animation: marquee 18s linear infinite;
}

.nowPlayingTrack span {
  padding-right: 3ch; /* gap between the repeated copies */
}

@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
```
And in the existing `@media (max-width: 1100px)` block, add:
```css
  .nowPlaying {
    font-size: 21px;
  }
```

- [ ] **Step 3: Create `app/components/NowPlaying.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import styles from "../menu.module.css";

type State = { playing: boolean; title: string | null; artist: string | null };

const IDLE_TEXT = "♪ Nothing playing";

export default function NowPlaying() {
  const [state, setState] = useState<State>({ playing: false, title: null, artist: null });

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/now-playing", { cache: "no-store" });
        const data = (await res.json()) as State;
        if (!cancelled) setState(data);
      } catch {
        // keep last state on transient failure
      }
    }
    poll();
    const interval = setInterval(poll, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const text =
    state.playing && state.title
      ? `Now playing: ${state.title} — ${state.artist}`
      : IDLE_TEXT;

  return (
    <div className={styles.nowPlaying}>
      <div className={styles.nowPlayingTrack}>
        <span>{text}</span>
        <span aria-hidden="true">{text}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Render it under the Wi-Fi line in `app/components/Featured.tsx`**

Add the import and place `<NowPlaying />` immediately after the closing `</div>` of the `.wifi` block, before the `.section`:

```tsx
import NowPlaying from "./NowPlaying";
```
```tsx
        coffeetime1234
      </div>
      <NowPlaying />
      <div className={styles.section}>
```

- [ ] **Step 5: Verify render + build**

```bash
pkill -9 -f vinext 2>/dev/null; sleep 2
nohup pnpm dev >/tmp/np.log 2>&1 &
sleep 12
echo "font requested:"; curl -sS http://127.0.0.1:3000/ | grep -o "DotGothic16" | head -1
echo "idle marquee present:"; curl -sS http://127.0.0.1:3000/ | grep -o "Nothing playing" | head -1
pkill -9 -f vinext 2>/dev/null
pnpm build >/tmp/b.log 2>&1 && echo BUILD_OK || tail -12 /tmp/b.log
pnpm exec tsc --noEmit 2>&1 | grep -viE "validator.ts|Fetcher|worker/index.ts" | grep -cE "error TS"
```
Expected: prints `DotGothic16`, `Nothing playing` (the SSR/idle text), `BUILD_OK`, and `0` new tsc errors. (The featured column only renders if `featured.json` has an image — it currently does, so the marquee shows.)

- [ ] **Step 6: Commit**

```bash
git add app/components/NowPlaying.tsx app/menu.module.css app/layout.tsx app/components/Featured.tsx
git commit -m "feat: LED now-playing marquee under the wifi line"
```

---

### Task 4: CI secret passthrough + refresh-token doc

Make the three Spotify secrets reach the deployed Worker, and document how to obtain the refresh token (paste-proof node helper, no fragile curl).

**Files:**
- Modify: `.github/workflows/deploy.yml` (pass Spotify secrets to the Worker on deploy)
- Create: `scripts/spotify-refresh-token.mjs`
- Create: `scripts/spotify-refresh-token.md`

**Interfaces:**
- Consumes: GH production-environment secrets `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` / `SPOTIFY_REFRESH_TOKEN`.

- [ ] **Step 1: Pass the secrets to the Worker in `deploy.yml`**

In the `Deploy to Cloudflare Workers` step (the `cloudflare/wrangler-action@v3` step), add a `secrets` input and an `env` block so wrangler uploads them as Worker secrets at deploy time:

```yaml
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
          secrets: |
            SPOTIFY_CLIENT_ID
            SPOTIFY_CLIENT_SECRET
            SPOTIFY_REFRESH_TOKEN
        env:
          SPOTIFY_CLIENT_ID: ${{ secrets.SPOTIFY_CLIENT_ID }}
          SPOTIFY_CLIENT_SECRET: ${{ secrets.SPOTIFY_CLIENT_SECRET }}
          SPOTIFY_REFRESH_TOKEN: ${{ secrets.SPOTIFY_REFRESH_TOKEN }}
```
(`wrangler-action`'s `secrets:` input reads each named var from the step `env` and runs `wrangler secret put` for it. Missing GH secrets upload as empty, which the route treats as fail-closed — safe.)

- [ ] **Step 2: Create the paste-proof token helper `scripts/spotify-refresh-token.mjs`**

```js
// One-time helper to obtain a Spotify refresh token. No fragile shell curl.
// Usage: node scripts/spotify-refresh-token.mjs
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const REDIRECT = "http://127.0.0.1:8888/callback";
const SCOPE = "user-read-currently-playing";
const rl = createInterface({ input, output });

const id = (await rl.question("Spotify Client ID: ")).trim();
const secret = (await rl.question("Spotify Client Secret: ")).trim();

const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({ client_id: id, response_type: "code", redirect_uri: REDIRECT, scope: SCOPE });

console.log("\n1) Open this URL in your browser and approve:\n\n" + authUrl + "\n");
console.log(`2) You'll land on ${REDIRECT}?code=... (the page won't load — that's fine).`);
const code = (await rl.question("3) Paste the code value here: ")).trim();
rl.close();

const res = await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
  },
  body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT }),
});
const data = await res.json();
if (!res.ok || !data.refresh_token) {
  console.error("\nFailed:", JSON.stringify(data, null, 2));
  process.exit(1);
}
console.log("\nSUCCESS. Add these as secrets (GitHub production environment):\n");
console.log("SPOTIFY_CLIENT_ID=" + id);
console.log("SPOTIFY_CLIENT_SECRET=" + secret);
console.log("SPOTIFY_REFRESH_TOKEN=" + data.refresh_token);
```

- [ ] **Step 3: Create `scripts/spotify-refresh-token.md`**

````markdown
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
````

- [ ] **Step 4: Validate workflow YAML + helper parses**

```bash
pnpm dlx js-yaml .github/workflows/deploy.yml > /dev/null && echo "yaml ok"
node --check scripts/spotify-refresh-token.mjs && echo "helper ok"
```
Expected: `yaml ok` and `helper ok`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy.yml scripts/spotify-refresh-token.mjs scripts/spotify-refresh-token.md
git commit -m "ci: pass Spotify secrets to Worker; add refresh-token helper + docs"
```

---

## Definition of Done

- `parseNowPlaying` unit-tested and passing (Task 1).
- `/api/now-playing` returns `{playing,title,artist}` with `no-store`, fail-closed on missing/bad secrets, runtime secrets confirmed via `process.env` (Task 2).
- Marquee renders under the Wi-Fi line in DotGothic16, polls every 20s, shows `♪ Nothing playing` when idle (Task 3).
- `deploy.yml` uploads the three Spotify secrets to the Worker; refresh-token helper + doc committed (Task 4).
- `pnpm build` green; no new tsc errors; existing menu/featured/rotation intact.

**User's follow-up (outside this plan):** run `node scripts/spotify-refresh-token.mjs`, add the three secrets to the GH production environment (and optionally `.dev.vars` to test locally), then deploy.
