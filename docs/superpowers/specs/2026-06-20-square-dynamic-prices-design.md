# Dynamic menu prices from Square POS

**Date:** 2026-06-20
**Status:** Approved, pending implementation plan

## Goal

Make menu prices dynamic from Square POS data while keeping the curated layout. A scheduled
GitHub job fetches the Square catalog, writes a committed snapshot file, and the existing
deploy + auto-reload pipeline pushes new prices to the kiosks. The live site never talks to
Square — it reads the baked snapshot.

## Model (confirmed with user)

- **Model A — curated layout, Square fills values.** The app owns structure (which spots
  exist, position, `kind`, order, local labels). Each spot may bind to a Square catalog object
  and pull data from it.
- **Price-only for now.** Only the price is overridden from Square. Labels stay local. The
  generated snapshot stores the *full* record (label, price, etc.) so a future "dynamic label"
  step needs no re-architecting.
- **Mapping key = Square variation ID** (the stable id Square guarantees across renames).
- **Static + dynamic mixture:** a line without a `squareId` stays 100% static (the add-on,
  anything not in Square).

## Components

### 1. Generated snapshot — `app/square-snapshot.json` (committed)

A JSON object keyed by Square **variation id**:

```json
{
  "VARIATION_ID_1": { "label": "Latte", "price": "4.50", "amountCents": 450, "currency": "USD" },
  "VARIATION_ID_2": { "label": "Cappuccino", "price": "4.00", "amountCents": 400, "currency": "USD" }
}
```

- `label` = the **parent ITEM's** name (the variation's own name is usually "Regular"/"Small").
- `price` = display string derived from `amountCents` (e.g. `450 → "4.50"`).
- Committed initially as `{}` so the app builds and renders (all fallbacks) before Square is
  wired or a token exists.

### 2. Curated structure — `app/menu-data.ts`

`Row` gains an optional `squareId`:

```ts
export type Row = {
  price: string;        // fallback price, used if no squareId / not in snapshot
  name: string;
  kind: RowKind;
  squareId?: string;    // Square variation id; when set, price comes from the snapshot
};
```

Existing rows are unchanged until you add `squareId` to the ones you want dynamic.

### 3. Merge — `app/prices.ts`

```ts
import snapshot from "./square-snapshot.json";
import type { Row } from "./menu-data";

type Snapshot = Record<string, { label: string; price: string; amountCents: number; currency: string }>;

export function resolvePrice(row: Row): string {
  const entry = (snapshot as Snapshot)[row.squareId ?? ""];
  return entry?.price ?? row.price;
}
```

`Menu.tsx` maps each row through `resolvePrice` before rendering, so `MenuRow` stays purely
presentational (receives the final price string). Rule: `price = snapshot[squareId]?.price ?? row.price`.
A mapped id missing from the snapshot (e.g. variable pricing, or item deleted) → silent fallback.

### 4. Fetch script — `scripts/fetch-square-prices.mjs`

Node ESM, no dependencies (uses built-in `fetch`; CI runs Node 22).

- `GET {BASE}/v2/catalog/list?types=ITEM,ITEM_VARIATION`, header `Authorization: Bearer ${SQUARE_ACCESS_TOKEN}`, paginating via the `cursor` query param until exhausted.
- `BASE` = `https://connect.squareup.com` (production) or `https://connect.squareupsandbox.com`
  when `SQUARE_ENV=sandbox`.
- Build `itemId → itemName` from the `ITEM` objects.
- For each `ITEM_VARIATION` with `item_variation_data.price_money` (fixed pricing only):
  emit `{ [variationId]: { label: itemName, price: format(amount), amountCents: amount, currency } }`.
- Variations without `price_money` (variable pricing) are skipped → those spots fall back.
- `format(cents)` = `(cents / 100).toFixed(2)`.
- Write the object (stable key order) to `app/square-snapshot.json`.
- **Fail closed:** on any non-200 response, network error, or empty/invalid catalog, exit
  non-zero and do **not** write the file — the last-good committed snapshot stays.

### 5. Refresh workflow — `.github/workflows/refresh-prices.yml`

```yaml
name: Refresh prices

on:
  schedule:
    - cron: "0 11 * * *"   # 5am CST / 6am CDT — before the 7am open
  workflow_dispatch: {}

permissions:
  contents: write

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: node scripts/fetch-square-prices.mjs
        env:
          SQUARE_ACCESS_TOKEN: ${{ secrets.SQUARE_ACCESS_TOKEN }}
          # SQUARE_ENV: sandbox   # omit for production
      - name: Commit if changed
        run: |
          if [ -n "$(git status --porcelain app/square-snapshot.json)" ]; then
            git config user.name "prices-bot"
            git config user.email "actions@users.noreply.github.com"
            git add app/square-snapshot.json
            git commit -m "chore: refresh Square prices"
            git push
          else
            echo "No price changes."
          fi
```

- **Commit only on change** → the push fires the existing `deploy.yml` → build bakes the new
  snapshot → kiosks auto-reload (new commit = new `BUILD_ID`). No change → no deploy.
- Daily at 11:00 UTC + manual `workflow_dispatch`.

### 6. Secrets / environment

- `SQUARE_ACCESS_TOKEN` — a GitHub **repo secret** used only by this job. Scope: `ITEMS_READ`.
  Never goes near the Worker.
- Production Square token for real prices; a sandbox token + `SQUARE_ENV=sandbox` for testing.
- This job does **not** use the `production` environment (that's for Cloudflare deploys); it
  only needs `contents: write` to push the snapshot.

## Data flow

1. 11:00 UTC (or manual) → `refresh-prices.yml` runs `fetch-square-prices.mjs`.
2. Script pulls the catalog, builds the snapshot, writes `app/square-snapshot.json`.
3. If the file changed → commit + push to `main`.
4. Push triggers `deploy.yml` → `pnpm build` bakes the snapshot via `resolvePrice` → deploy.
5. Kiosks poll `/api/version`, see the new `BUILD_ID`, reload → new prices on screen.

## Error handling

- **Square down / API error / empty catalog:** script exits non-zero, writes nothing; job
  fails loudly; last-good snapshot remains; board unaffected.
- **Mapped id not in snapshot (variable pricing, deleted item):** `resolvePrice` falls back to
  the local price. No crash, no blank.
- **No token / first run before Square is set up:** snapshot stays `{}`; every line uses its
  local fallback price. The feature ships safely before Square is wired.

## Verification

- `node scripts/fetch-square-prices.mjs` with a sandbox token writes a valid snapshot; with no
  token / a bad token it exits non-zero and leaves the file untouched.
- After adding a `squareId` to a row and putting a matching entry in the snapshot, `pnpm dev`
  shows the snapshot price; removing the entry shows the fallback.
- `pnpm build` succeeds with both a populated and an empty (`{}`) snapshot.
- Workflow YAML is valid and commits only when `app/square-snapshot.json` changes.

## Out of scope (YAGNI)

- Dynamic labels / names from Square (snapshot already carries `label` for later).
- The add-on `+0.50` (a Square *modifier* — different shape; stays static).
- Sold-out / availability, categories driving structure, modifiers, taxes.
- Square webhooks for instant updates (possible phase 2; daily cron + manual is enough now).
- Runtime Square calls from the Worker (explicitly avoided — keeps the live path static).
