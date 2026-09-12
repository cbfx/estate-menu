# Rotating Event Menus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rotate the display between the regular menu and time-windowed event slides, with smooth blur/fly-forward transitions, driven by a reusable colocated-config registry.

**Architecture:** Each event is one file exporting `config` (UTC window + duration) and a slide component. A registry lists them in play order. A client `Rotation` controller computes the active set from `Date.now()`, runs a state machine (`regular 60s → active slides back-to-back → regular …`), and cross-fades screens with Framer Motion. The regular `<Menu/>` stays a server component passed as children. Pure time logic is isolated in `app/events/schedule.ts` and unit-tested with `node --test`.

**Tech Stack:** vinext (Vite + React 19, App Router), `motion` (Framer Motion) `^13`, CSS Modules, Node built-in `node --test`.

## Global Constraints

- Package manager: **pnpm**. Vite must stay **8.x** (vite 7 crashes the vinext CLI).
- `motion@^13` — import from `motion/react` (supports React 19; verified peer `react ^19`).
- Windows are **UTC ISO 8601** strings; compare with `Date.now()` (epoch ms). No timezone library.
- Regular menu phase = **60s** while any event is active; when none active, render regular only (no timers, no transitions).
- Multiple active events play **back-to-back** in registry order, then one regular phase.
- Event slide files are `"use client"`. `Menu.tsx` stays a server component.
- Known pre-existing `tsc` noise: 4 errors (3 in `.next/types/validator.ts`, 1 `Fetcher` in `worker/index.ts`). Gate = no NEW errors beyond those 4.
- Verification is `node --test` (for schedule logic) + `pnpm build` + dev-server render. No UI test framework.

**Working directory:** `/Users/cbfx/code/cbfx/estate-menu` (git repo, branch `main`, clean tree). `pnpm dev` → http://localhost:3000.

---

### Task 1: Event types + schedule logic (TDD)

Pure, dependency-free time logic and the shared types. This is the only unit-tested piece.

**Files:**
- Create: `app/events/types.ts`
- Create: `app/events/schedule.ts`
- Test: `app/events/schedule.test.mjs`

**Interfaces:**
- Produces:
  - `type EventConfig = { id: string; start: string; end: string; durationSeconds: number }` (in `types.ts`)
  - `type Slide = { config: EventConfig; Component: import("react").ComponentType }` (in `types.ts`)
  - `isActive(config: EventConfig, nowMs: number): boolean` (in `schedule.ts`)
  - `activeSlides(slides: Slide[], nowMs: number): Slide[]` (in `schedule.ts`) — registry order preserved

- [ ] **Step 1: Write the failing test `app/events/schedule.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { isActive, activeSlides } from "./schedule.ts";

const cfg = (over = {}) => ({
  id: "e",
  start: "2026-09-12T14:00:00Z",
  end: "2026-09-12T17:00:00Z",
  durationSeconds: 60,
  ...over,
});
const at = (iso) => Date.parse(iso);

test("isActive true inside the window (inclusive bounds)", () => {
  assert.equal(isActive(cfg(), at("2026-09-12T14:00:00Z")), true);
  assert.equal(isActive(cfg(), at("2026-09-12T15:30:00Z")), true);
  assert.equal(isActive(cfg(), at("2026-09-12T17:00:00Z")), true);
});

test("isActive false outside the window", () => {
  assert.equal(isActive(cfg(), at("2026-09-12T13:59:59Z")), false);
  assert.equal(isActive(cfg(), at("2026-09-12T17:00:01Z")), false);
});

test("isActive false for malformed/misordered windows", () => {
  assert.equal(isActive(cfg({ start: "nonsense" }), at("2026-09-12T15:00:00Z")), false);
  assert.equal(isActive(cfg({ start: "2026-09-12T17:00:00Z", end: "2026-09-12T14:00:00Z" }), at("2026-09-12T15:00:00Z")), false);
});

test("activeSlides filters and preserves registry order", () => {
  const A = { config: cfg({ id: "a" }), Component: () => null };
  const B = { config: cfg({ id: "b", start: "2000-01-01T00:00:00Z", end: "2000-01-02T00:00:00Z" }), Component: () => null };
  const C = { config: cfg({ id: "c" }), Component: () => null };
  const now = at("2026-09-12T15:00:00Z");
  assert.deepEqual(activeSlides([A, B, C], now).map((s) => s.config.id), ["a", "c"]);
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `node --test app/events/schedule.test.mjs`
Expected: FAIL (cannot find module `./schedule.ts` / exports undefined). Node 22 runs `.ts` imports from `.mjs` via its strip-types support; if the import errors on the `.ts` extension in this environment, rename the test import to `./schedule.mjs` and author `schedule.ts` — then re-run. Report which worked.

- [ ] **Step 3: Create `app/events/types.ts`**

```ts
import type { ComponentType } from "react";

export type EventConfig = {
  id: string;
  start: string; // UTC ISO 8601, e.g. "2026-09-12T14:00:00Z"
  end: string; // UTC ISO 8601
  durationSeconds: number;
};

export type Slide = {
  config: EventConfig;
  Component: ComponentType;
};
```

- [ ] **Step 4: Create `app/events/schedule.ts`**

```ts
import type { EventConfig, Slide } from "./types";

export function isActive(config: EventConfig, nowMs: number): boolean {
  const start = Date.parse(config.start);
  const end = Date.parse(config.end);
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) return false;
  return nowMs >= start && nowMs <= end;
}

export function activeSlides(slides: Slide[], nowMs: number): Slide[] {
  return slides.filter((s) => isActive(s.config, nowMs));
}
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `node --test app/events/schedule.test.mjs`
Expected: PASS — 4 tests, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add app/events/types.ts app/events/schedule.ts app/events/schedule.test.mjs
git commit -m "feat: event types + schedule logic with tests"
```

---

### Task 2: Raja slide + registry

The first event file (config + placeholder component) and the ordered registry.

**Files:**
- Create: `app/events/happy-birthday-raja.tsx`
- Create: `app/events/registry.ts`
- Create: `app/events/events.module.css`

**Interfaces:**
- Consumes: `EventConfig`, `Slide` from `./types`.
- Produces: `slides: Slide[]` (default-ordered array) from `app/events/registry.ts`.

- [ ] **Step 1: Create `app/events/events.module.css`**

```css
.slide {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.birthday {
  font-size: clamp(64px, 12vw, 200px);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1;
}
```

- [ ] **Step 2: Create `app/events/happy-birthday-raja.tsx`**

```tsx
"use client";

import type { EventConfig } from "./types";
import styles from "./events.module.css";

export const config: EventConfig = {
  id: "happy-birthday-raja",
  start: "2026-09-12T14:00:00Z", // Sept 12, 9:00am CDT
  end: "2026-09-12T17:00:00Z", // Sept 12, 12:00pm CDT
  durationSeconds: 60,
};

export default function HappyBirthdayRaja() {
  return (
    <div className={styles.slide}>
      <div className={styles.birthday}>HAPPY BIRTHDAY</div>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/events/registry.ts`**

```ts
import type { Slide } from "./types";
import Raja, { config as raja } from "./happy-birthday-raja";

// Array order = back-to-back play order when multiple events are active.
export const slides: Slide[] = [{ config: raja, Component: Raja }];
```

- [ ] **Step 4: Verify type-check introduces no new errors**

Run: `pnpm exec tsc --noEmit`
Expected: only the 4 known pre-existing errors. A new error about the `.css` import is acceptable only if that is its sole nature (the app already imports CSS modules elsewhere without issue, so none is expected). Any new error in the `.ts`/`.tsx` files must be fixed.

- [ ] **Step 5: Commit**

```bash
git add app/events/happy-birthday-raja.tsx app/events/registry.ts app/events/events.module.css
git commit -m "feat: HAPPY BIRTHDAY Raja slide + registry"
```

---

### Task 3: Install motion

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Produces: `motion/react` exports `motion`, `AnimatePresence` for later tasks.

- [ ] **Step 1: Install motion**

```bash
pnpm add motion@^13
```
Expected: `motion` in `dependencies`; install completes.

- [ ] **Step 2: Verify it resolves and the build still works**

```bash
node -e "console.log(require('motion/package.json').version)"
pnpm build > /tmp/b.log 2>&1 && echo "BUILD OK" || tail -20 /tmp/b.log
```
Expected: prints a `13.x` version and `BUILD OK`.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add motion (Framer Motion) for transitions"
```

---

### Task 4: Rotation controller + transitions

The client state machine that cross-fades between the regular menu and active slides.

**Files:**
- Create: `app/components/Rotation.tsx`
- Create: `app/rotation.module.css`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `slides` from `../events/registry`; `activeSlides` from `../events/schedule`; `motion`, `AnimatePresence` from `motion/react`.
- Produces: default `Rotation` React component taking `{ children: React.ReactNode }`.

- [ ] **Step 1: Create `app/rotation.module.css`**

```css
.stage {
  position: relative;
  width: 100%;
  min-height: 100vh;
}

.screen {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform, filter, opacity;
}
```

- [ ] **Step 2: Create `app/components/Rotation.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { slides } from "../events/registry";
import { activeSlides } from "../events/schedule";
import type { Slide } from "../events/types";
import styles from "../rotation.module.css";

const REGULAR_SECONDS = 60;

// One phase = a screen shown for a fixed number of seconds.
type Phase = { key: string; node: React.ReactNode; seconds: number };

const enter = { opacity: 0, scale: 0.92, filter: "blur(12px)" };
const center = { opacity: 1, scale: 1, filter: "blur(0px)" };
const leave = { opacity: 0, scale: 1.08, filter: "blur(16px)" };
const transition = { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const };

export default function Rotation({ children }: { children: React.ReactNode }) {
  // Build the phase list for one full cycle, given the currently active slides.
  function buildCycle(active: Slide[]): Phase[] {
    const regular: Phase = { key: "regular", node: children, seconds: REGULAR_SECONDS };
    if (active.length === 0) return [regular];
    return [
      regular,
      ...active.map((s) => ({
        key: s.config.id,
        node: <s.Component />,
        seconds: s.config.durationSeconds,
      })),
    ];
  }

  const [cycle, setCycle] = useState<Phase[]>(() =>
    buildCycle(activeSlides(slides, Date.now())),
  );
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const phase = cycle[index];
    if (!phase) return;

    // If this is the last phase of the cycle, recompute the active set for the
    // next cycle (events entering/leaving their window take effect here).
    timer.current = setTimeout(() => {
      const isLast = index >= cycle.length - 1;
      if (isLast) {
        const next = buildCycle(activeSlides(slides, Date.now()));
        setCycle(next);
        setIndex(0);
      } else {
        setIndex((i) => i + 1);
      }
    }, phase.seconds * 1000);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, index]);

  const phase = cycle[index] ?? cycle[0];

  return (
    <div className={styles.stage}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={phase.key}
          className={styles.screen}
          initial={enter}
          animate={center}
          exit={leave}
          transition={transition}
        >
          {phase.node}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: Update `app/page.tsx`**

```tsx
import AutoRefresh from "./components/AutoRefresh";
import Menu from "./components/Menu";
import Rotation from "./components/Rotation";

export default function Home() {
  return (
    <>
      <Rotation>
        <Menu />
      </Rotation>
      <AutoRefresh buildId={__BUILD_ID__} />
    </>
  );
}
```

- [ ] **Step 4: Verify no-active-event behavior (default dates) + build**

```bash
pnpm build > /tmp/b.log 2>&1 && echo "BUILD OK" || tail -20 /tmp/b.log
pnpm dev > /tmp/d.log 2>&1 &
DEV_PID=$!
sleep 9
echo "regular menu renders, no birthday:"
curl -sS http://localhost:3000 | grep -q "Espresso" && echo "MENU OK"
curl -sS http://localhost:3000 | grep -c "HAPPY BIRTHDAY"
kill $DEV_PID 2>/dev/null
```
Expected: `BUILD OK`, `MENU OK`, and the HAPPY BIRTHDAY count is `0` (Raja window is in the past/future, so no event is active and only the regular menu shows).

- [ ] **Step 5: Commit**

```bash
git add app/components/Rotation.tsx app/rotation.module.css app/page.tsx
git commit -m "feat: rotation controller with Framer Motion transitions"
```

---

### Task 5: Manual rotation verification (temporary widened window)

Prove the rotation + transition actually cycle, using a temporary always-on window, then revert.

**Files:**
- Temporarily modify then revert: `app/events/happy-birthday-raja.tsx`

- [ ] **Step 1: Temporarily widen Raja's window to always-active**

In `app/events/happy-birthday-raja.tsx`, temporarily set:
```ts
  start: "2000-01-01T00:00:00Z",
  end: "2999-01-01T00:00:00Z",
  durationSeconds: 3,
```
(Short duration so the cycle is observable quickly.)

- [ ] **Step 2: Verify both screens appear across the cycle**

```bash
pnpm dev > /tmp/d.log 2>&1 &
DEV_PID=$!
sleep 9
echo "birthday present in DOM (client-rendered after hydration):"
# The slide mounts client-side; check the client bundle contains the text and the
# rotation module, then confirm no server error.
curl -sS http://localhost:3000 | grep -q "Espresso" && echo "INITIAL MENU OK"
grep -q "HAPPY BIRTHDAY" app/events/happy-birthday-raja.tsx && echo "SLIDE SOURCE OK"
kill $DEV_PID 2>/dev/null
```
Expected: `INITIAL MENU OK` and `SLIDE SOURCE OK`. The regular menu is the first phase (server-rendered); the birthday slide is client-mounted after 60s → for a fast visual check, also open http://localhost:3000 in a browser with `REGULAR_SECONDS` temporarily lowered if desired. **Primary gate: the app builds and the menu renders without runtime error in `/tmp/d.log`.**

```bash
grep -iE "error|unhandled" /tmp/d.log | grep -viE "0 error" || echo "NO DEV ERRORS"
```
Expected: `NO DEV ERRORS`.

- [ ] **Step 3: Revert the window to the real Raja dates**

Restore `app/events/happy-birthday-raja.tsx` to:
```ts
  start: "2026-09-12T14:00:00Z",
  end: "2026-09-12T17:00:00Z",
  durationSeconds: 60,
```

- [ ] **Step 4: Confirm reverted + build**

```bash
grep -q '2026-09-12T14:00:00Z' app/events/happy-birthday-raja.tsx && echo "REVERTED"
pnpm build > /tmp/b.log 2>&1 && echo "BUILD OK" || tail -20 /tmp/b.log
git diff --quiet && echo "CLEAN (nothing to commit)" || git status --short
```
Expected: `REVERTED`, `BUILD OK`, `CLEAN` (the temporary edit was reverted, so there's nothing to commit from this task).

---

### Task 6: README

Document how to add a slide.

**Files:**
- Create: `app/events/README.md`

- [ ] **Step 1: Create `app/events/README.md`**

````markdown
# Event slides (rotating secondary menus)

The kiosk normally shows the regular coffee menu. During an event's time window, the
display **rotates** between the regular menu and one or more event slides.

## Rotation rules

- When **no** event is active, only the regular menu shows — no rotation, no timers.
- When one or more events are active:
  `regular (60s) → event A → event B → … → regular (60s) → …`
  Active events play **back-to-back** (in registry order), separated by one 60s regular phase.
- An event is "active" when `now` is within its `start`–`end` window.
- Events entering/leaving their window take effect at the next regular phase; a slide already
  on screen finishes its configured duration first.
- Transitions between screens fade + blur + fly-forward (Framer Motion).

## Add a slide (3 steps)

**1. Create `app/events/<your-id>.tsx`** exporting a `config` and a default component:

```tsx
"use client";

import type { EventConfig } from "./types";
import styles from "./events.module.css";

export const config: EventConfig = {
  id: "summer-launch",
  start: "2026-07-01T13:00:00Z", // see UTC note below
  end: "2026-07-01T20:00:00Z",
  durationSeconds: 45,
};

export default function SummerLaunch() {
  return (
    <div className={styles.slide}>
      <div className={styles.birthday}>SUMMER MENU IS HERE</div>
    </div>
  );
}
```

**2. Register it** in `app/events/registry.ts` (array order = back-to-back play order):

```ts
import Summer, { config as summer } from "./summer-launch";

export const slides: Slide[] = [
  { config: raja, Component: Raja },
  { config: summer, Component: Summer }, // add this line
];
```

**3. Preview + ship:** `pnpm dev` to preview, then commit + push (deploy is required — the
schedule is baked at build time).

## `EventConfig` fields

| Field | Meaning |
| --- | --- |
| `id` | Unique, kebab-case. Used as the transition key. |
| `start` / `end` | The active window, as **UTC** ISO 8601 strings (see below). |
| `durationSeconds` | How long the slide stays on screen per appearance. |

## UTC time — important

`start`/`end` are compared against the browser clock as **UTC epoch milliseconds**. Author them
in UTC and convert from local time yourself:

- **Central Daylight Time (Mar–Nov)** is **UTC−5** → add 5 hours. 9:00am CDT = `14:00:00Z`.
- **Central Standard Time (Nov–Mar)** is **UTC−6** → add 6 hours. 9:00am CST = `15:00:00Z`.

Example: Sept 12, 9am–12pm (CDT) → `2026-09-12T14:00:00Z` to `2026-09-12T17:00:00Z`.

## Preview a slide outside its window

Temporarily widen the window and shorten the duration, then revert before committing:

```ts
start: "2000-01-01T00:00:00Z",
end: "2999-01-01T00:00:00Z",
durationSeconds: 3,
```

## Assets / bigger slides

A slide is a flat file until it needs its own assets or CSS. When it does, promote it to a
folder with an `index.tsx` (same exports) and keep its image/CSS alongside:

```
app/events/summer-launch/
├── index.tsx      # exports `config` + default component
├── hero.jpg
└── summer.module.css
```

The registry import path (`./summer-launch`) stays the same.
````

- [ ] **Step 2: Commit**

```bash
git add app/events/README.md
git commit -m "docs: how to add event slides"
```

---

## Definition of Done

- `isActive` / `activeSlides` unit-tested and passing (`node --test`) — Task 1.
- Raja slide + registry exist; type-checks clean — Task 2.
- `motion@^13` installed; build green — Task 3.
- `Rotation` cross-fades regular ↔ active slides with blur/fly transitions; no active event → regular only, no timers; back-to-back ordering — Task 4.
- Manual widened-window check passes, then reverted to real dates — Task 5.
- `app/events/README.md` documents adding a slide, the UTC caveat, preview trick, and folder promotion — Task 6.
- `pnpm build` green; existing prices/featured/AutoRefresh intact.

**User's follow-up (outside this plan):** design the real Raja slide visuals; deploy so the Sept 12 window goes live.
