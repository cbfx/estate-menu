# Square Dynamic Prices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make mapped menu prices come from a committed Square snapshot that a daily GitHub job regenerates, while the live site stays fully static (reads the baked snapshot, never calls Square).

**Architecture:** The app reads `app/square-snapshot.json` (keyed by Square variation id) and, for any `menu-data` row carrying a `squareId`, overrides its price (`snapshot[id]?.price ?? row.price`). A dependency-free Node script fetches Square's Catalog API, transforms ITEM + ITEM_VARIATION objects into that snapshot, and a scheduled workflow commits it only when it changes — which reuses the existing deploy + auto-reload pipeline.

**Tech Stack:** vinext (Vite + React 19, App Router), Node 22 built-in `fetch` + `node --test`, Square Catalog API, GitHub Actions.

**Testing note:** the snapshot **transform** is pure logic and is built TDD with `node --test` (no new dependency). App plumbing, the fetch I/O wrapper, and the workflow are verified by build/render/fail-closed/YAML-validity gates. There is no UI test framework (consistent with the rest of this repo).

**Working directory:** `/Users/cbfx/code/cbfx/estate-menu` (git repo, branch `main`, clean tree). pnpm. `pnpm dev` serves on http://localhost:3000.

**Known pre-existing `tsc` noise (not this feature's fault):** `pnpm exec tsc --noEmit` reports 4 pre-existing errors (3 in `.next/types/validator.ts`, 1 `Fetcher` in `worker/index.ts`). The gate for TS tasks is "no NEW errors beyond those 4."

---

### Task 1: Make the app snapshot-aware (all fallback, no visible change)

Adds the snapshot file, the `squareId` field, the resolver, and wires it into rendering. With an empty snapshot every price falls back to its local value, so the menu looks identical — this task is pure plumbing.

**Files:**
- Create: `app/square-snapshot.json`
- Create: `app/prices.ts`
- Modify: `app/menu-data.ts` (add `squareId` to `Row`)
- Modify: `app/components/Menu.tsx` (resolve price before render)

- [ ] **Step 1: Create the initial empty snapshot `app/square-snapshot.json`**

```json
{}
```

- [ ] **Step 2: Add `squareId` to the `Row` type in `app/menu-data.ts`**

Change the `Row` type (top of the file) to:

```ts
export type Row = {
  price: string;
  name: string;
  kind: RowKind;
  squareId?: string;
};
```

Leave all the existing row data unchanged.

- [ ] **Step 3: Create `app/prices.ts`**

```ts
import snapshot from "./square-snapshot.json";
import type { Row } from "./menu-data";

type SnapshotEntry = {
  label: string;
  price: string;
  amountCents: number;
  currency: string;
};
type Snapshot = Record<string, SnapshotEntry>;

export function resolvePrice(row: Row): string {
  const entry = (snapshot as Snapshot)[row.squareId ?? ""];
  return entry?.price ?? row.price;
}
```

- [ ] **Step 4: Wire `resolvePrice` into `app/components/Menu.tsx`**

Add the import and override the `price` prop in BOTH render spots (the espresso map and the `Section` map). The full file becomes:

```tsx
import styles from "../menu.module.css";
import { espresso, sections, type Row } from "../menu-data";
import MenuRow from "./MenuRow";
import { resolvePrice } from "../prices";

function Section({ rows }: { rows: Row[] }) {
  return (
    <div className={styles.section}>
      <div className={styles.items}>
        {rows.map((row, j) => (
          <MenuRow key={j} {...row} price={resolvePrice(row)} />
        ))}
      </div>
    </div>
  );
}

export default function Menu() {
  // Espresso in column 1; the section groups split across columns 2 and 3.
  const middle = sections.slice(0, 1);
  const right = sections.slice(1);

  return (
    <div className={styles.container}>
      <div className={styles.primaryColumn}>
        <div className={styles.espressoSection}>
          {espresso.map((row, i) => (
            <MenuRow key={i} {...row} price={resolvePrice(row)} />
          ))}
        </div>
      </div>
      <div className={styles.secondaryColumn}>
        {middle.map((rows, i) => (
          <Section key={i} rows={rows} />
        ))}
      </div>
      <div className={styles.secondaryColumn}>
        {right.map((rows, i) => (
          <Section key={i} rows={rows} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify type-check (no new errors) and that the render is unchanged**

```bash
pnpm exec tsc --noEmit; echo "tsc exit=$?"
```
Expected: only the 4 known pre-existing errors. If a NEW error appears about importing `./square-snapshot.json`, enable `"resolveJsonModule": true` in `tsconfig.json` `compilerOptions` (Next usually sets it already) and re-run.

```bash
pnpm dev >/tmp/d.log 2>&1 &
DEV_PID=$!
sleep 9
curl -sS http://localhost:3000 | grep -oE "3\.25|4\.50|8\.00" | sort -u
kill $DEV_PID 2>/dev/null
```
Expected: the original fallback prices still render (e.g. `3.25`, `4.50`, `8.00`).

- [ ] **Step 6: Prove the override works, then revert the probe**

Temporarily set `app/square-snapshot.json` to:
```json
{ "PROBE": { "label": "probe", "price": "9.99", "amountCents": 999, "currency": "USD" } }
```
and temporarily add `squareId: "PROBE"` to the first espresso row (`Espresso`) in `app/menu-data.ts`. Then:
```bash
pnpm dev >/tmp/d.log 2>&1 &
DEV_PID=$!
sleep 9
curl -sS http://localhost:3000 | grep -q "9.99" && echo "OVERRIDE OK"
kill $DEV_PID 2>/dev/null
```
Expected: `OVERRIDE OK`. Then **revert both probes**: snapshot back to `{}` and remove the `squareId` from the Espresso row.

- [ ] **Step 7: Verify build and commit**

```bash
pnpm build >/tmp/b.log 2>&1 && echo "BUILD OK" || tail -15 /tmp/b.log
git add app/square-snapshot.json app/prices.ts app/menu-data.ts app/components/Menu.tsx
git commit -m "feat: read prices from Square snapshot with local fallback"
```
Expected: `BUILD OK`; `git status --short` clean after commit (snapshot is `{}`, no probe left).

---

### Task 2: Snapshot transform (pure logic, TDD)

The pure functions that turn raw Square catalog objects into the snapshot map. Built test-first with `node --test`.

**Files:**
- Create: `scripts/square-transform.mjs`
- Test: `scripts/square-transform.test.mjs`

- [ ] **Step 1: Write the failing test `scripts/square-transform.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCents, buildSnapshot } from "./square-transform.mjs";

test("formatCents converts cents to a 2-decimal string", () => {
  assert.equal(formatCents(450), "4.50");
  assert.equal(formatCents(400), "4.00");
  assert.equal(formatCents(325), "3.25");
  assert.equal(formatCents(5), "0.05");
});

test("buildSnapshot joins variations to parent item names and keeps fixed prices", () => {
  const objects = [
    { type: "ITEM", id: "ITEM1", item_data: { name: "Latte" } },
    {
      type: "ITEM_VARIATION",
      id: "VAR1",
      item_variation_data: { item_id: "ITEM1", name: "Regular", price_money: { amount: 450, currency: "USD" } },
    },
  ];
  assert.deepEqual(buildSnapshot(objects), {
    VAR1: { label: "Latte", price: "4.50", amountCents: 450, currency: "USD" },
  });
});

test("buildSnapshot skips variations without fixed price_money", () => {
  const objects = [
    { type: "ITEM", id: "ITEM1", item_data: { name: "Drip" } },
    {
      type: "ITEM_VARIATION",
      id: "VAR2",
      item_variation_data: { item_id: "ITEM1", name: "Variable", pricing_type: "VARIABLE_PRICING" },
    },
  ];
  assert.deepEqual(buildSnapshot(objects), {});
});

test("buildSnapshot output keys are sorted for stable diffs", () => {
  const objects = [
    { type: "ITEM", id: "I", item_data: { name: "X" } },
    { type: "ITEM_VARIATION", id: "B", item_variation_data: { item_id: "I", name: "n", price_money: { amount: 100, currency: "USD" } } },
    { type: "ITEM_VARIATION", id: "A", item_variation_data: { item_id: "I", name: "n", price_money: { amount: 200, currency: "USD" } } },
  ];
  assert.deepEqual(Object.keys(buildSnapshot(objects)), ["A", "B"]);
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `node --test scripts/square-transform.test.mjs`
Expected: FAIL (cannot find module `./square-transform.mjs` / exports undefined).

- [ ] **Step 3: Implement `scripts/square-transform.mjs`**

```js
export function formatCents(amount) {
  return (amount / 100).toFixed(2);
}

export function buildSnapshot(objects) {
  const itemNames = {};
  for (const obj of objects) {
    if (obj.type === "ITEM") {
      itemNames[obj.id] = obj.item_data?.name ?? "";
    }
  }

  const entries = [];
  for (const obj of objects) {
    if (obj.type !== "ITEM_VARIATION") continue;
    const data = obj.item_variation_data ?? {};
    const money = data.price_money;
    if (!money || typeof money.amount !== "number") continue; // skip variable pricing
    entries.push([
      obj.id,
      {
        label: itemNames[data.item_id] ?? data.name ?? "",
        price: formatCents(money.amount),
        amountCents: money.amount,
        currency: money.currency,
      },
    ]);
  }

  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return Object.fromEntries(entries);
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `node --test scripts/square-transform.test.mjs`
Expected: PASS (4 tests, 0 failures).

- [ ] **Step 5: Commit**

```bash
git add scripts/square-transform.mjs scripts/square-transform.test.mjs
git commit -m "feat: add Square catalog -> snapshot transform with tests"
```

---

### Task 3: Square fetch script (I/O wrapper, fail-closed)

Wraps the transform with the actual Catalog API paging and the file write. Fails closed: writes nothing on error/empty.

**Files:**
- Create: `scripts/fetch-square-prices.mjs`

- [ ] **Step 1: Implement `scripts/fetch-square-prices.mjs`**

```js
import { writeFileSync } from "node:fs";
import { buildSnapshot } from "./square-transform.mjs";

const OUT = new URL("../app/square-snapshot.json", import.meta.url);

function baseUrl() {
  return process.env.SQUARE_ENV === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
}

async function fetchAllObjects(token) {
  const objects = [];
  let cursor = "";
  do {
    const url = new URL("/v2/catalog/list", baseUrl());
    url.searchParams.set("types", "ITEM,ITEM_VARIATION");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      throw new Error(`Square API ${res.status}: ${await res.text()}`);
    }
    const body = await res.json();
    if (Array.isArray(body.objects)) objects.push(...body.objects);
    cursor = body.cursor ?? "";
  } while (cursor);

  return objects;
}

async function main() {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) throw new Error("SQUARE_ACCESS_TOKEN is not set");

  const objects = await fetchAllObjects(token);
  if (objects.length === 0) {
    throw new Error("Square returned an empty catalog; refusing to overwrite snapshot");
  }

  const snapshot = buildSnapshot(objects);
  writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`Wrote ${Object.keys(snapshot).length} priced variations to app/square-snapshot.json`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Verify fail-closed with no token (must not touch the snapshot)**

```bash
cp app/square-snapshot.json /tmp/snap-before.json
env -u SQUARE_ACCESS_TOKEN node scripts/fetch-square-prices.mjs; echo "exit=$?"
diff -q app/square-snapshot.json /tmp/snap-before.json && echo "SNAPSHOT UNTOUCHED"
```
Expected: prints `SQUARE_ACCESS_TOKEN is not set`, `exit=1`, and `SNAPSHOT UNTOUCHED`.

- [ ] **Step 3: Verify fail-closed with a bad token (auth error, snapshot untouched)**

```bash
SQUARE_ACCESS_TOKEN=not-a-real-token node scripts/fetch-square-prices.mjs; echo "exit=$?"
diff -q app/square-snapshot.json /tmp/snap-before.json && echo "SNAPSHOT UNTOUCHED"
```
Expected: prints a `Square API 401` (or similar non-200) error, `exit=1`, `SNAPSHOT UNTOUCHED`. (This makes one real HTTPS call to Square's public API; if the network is unavailable it will instead error on fetch and still exit 1 without writing — also acceptable.)

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-square-prices.mjs
git commit -m "feat: add fail-closed Square catalog fetch script"
```

---

### Task 4: Daily refresh workflow

Scheduled + manual workflow that runs the fetch script and commits the snapshot only when it changes.

**Files:**
- Create: `.github/workflows/refresh-prices.yml`

- [ ] **Step 1: Create `.github/workflows/refresh-prices.yml`**

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

      - name: Fetch Square prices
        run: node scripts/fetch-square-prices.mjs
        env:
          SQUARE_ACCESS_TOKEN: ${{ secrets.SQUARE_ACCESS_TOKEN }}

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

- [ ] **Step 2: Verify the workflow is valid YAML**

```bash
pnpm dlx js-yaml .github/workflows/refresh-prices.yml > /dev/null && echo "valid yaml"
```
Expected: `valid yaml`.

- [ ] **Step 3: Confirm triggers, permission, and secret are wired**

```bash
grep -q 'cron: "0 11 \* \* \*"' .github/workflows/refresh-prices.yml \
  && grep -q "workflow_dispatch" .github/workflows/refresh-prices.yml \
  && grep -q "contents: write" .github/workflows/refresh-prices.yml \
  && grep -q "SQUARE_ACCESS_TOKEN" .github/workflows/refresh-prices.yml \
  && echo "wired"
```
Expected: `wired`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/refresh-prices.yml
git commit -m "ci: daily Square price refresh workflow"
```

---

## Definition of Done

- App reads `app/square-snapshot.json`; mapped rows (`squareId`) take the snapshot price, everything else falls back (Task 1).
- `buildSnapshot`/`formatCents` join variations to item names, keep fixed prices, skip variable pricing, and sort keys — all under passing `node --test` (Task 2).
- `fetch-square-prices.mjs` pages the Catalog API and writes the snapshot, but fails closed (no token / bad token / empty catalog → exit 1, file untouched) (Task 3).
- `refresh-prices.yml` runs daily at 11:00 UTC + manual, commits only on change, has `contents: write`, and uses `SQUARE_ACCESS_TOKEN` (Task 4).
- `pnpm build` stays green with the committed `{}` snapshot.

**User's follow-up (outside this plan):** add `SQUARE_ACCESS_TOKEN` as a GitHub repo secret, run the workflow once (manual dispatch) to populate the snapshot, then add real `squareId`s to the rows you want dynamic (look up each variation id by its `label` in the generated snapshot).
