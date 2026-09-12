# Rotating event menus (secondary menus)

**Date:** 2026-09-11
**Status:** Approved, pending implementation plan

## Goal

Rotate the display between the regular coffee menu and time-windowed "event" slides
(secondary menus). The first event is a placeholder **HAPPY BIRTHDAY** screen for Raja,
active Sept 12, 9am–12pm CDT, shown 60s per appearance. The system is reusable: any future
event is a single self-contained file dropped into `app/events/` and added to a registry.
Transitions between screens are smooth and cinematic (fade + blur + fly-forward), via
Framer Motion.

## Decisions (confirmed with user)

| Decision | Choice |
|---|---|
| Multiple active events | Play **back-to-back**, then one regular gap: `regular → A → B → regular → A → B → …` |
| Motion | **Framer Motion** (`motion` package, `motion/react`) |
| Time source | **UTC timestamps** in config; `now = Date.now()`; plain numeric compare (no tz lib, no DST math) |
| Regular menu duration | **60s** while any event is active; when none active it stays up statically (no rotation) |
| Slide + config colocation | **One file per event** exporting both `config` and the component; folder+`index.tsx` only if a slide grows assets |
| Raja slide | Placeholder centered "HAPPY BIRTHDAY"; real design later |
| Schedule source | Baked at build time (like menu data); add/edit event = edit file + deploy |
| Docs | A README documenting how to add a slide |

## File structure

```
app/
├── events/
│   ├── types.ts                 # EventConfig + Slide types
│   ├── registry.ts              # ordered array of { config, Component } — play order
│   ├── README.md                # how to add a slide (see below)
│   └── happy-birthday-raja.tsx  # exports `config` + default component ("use client")
├── components/
│   ├── Rotation.tsx             # "use client" — the rotation state machine + transitions
│   ├── Menu.tsx                 # unchanged (server component, build-time data)
│   └── … (AutoRefresh, Featured, MenuRow)
├── page.tsx                     # <Rotation><Menu/></Rotation> + <AutoRefresh/>
└── rotation.module.css          # transition/stage styles
```

## Config shape (`app/events/types.ts`)

```ts
import type { ComponentType } from "react";

export type EventConfig = {
  id: string;            // unique, kebab-case
  start: string;         // UTC ISO 8601, e.g. "2026-09-12T14:00:00Z"
  end: string;           // UTC ISO 8601
  durationSeconds: number; // seconds on screen per appearance
};

export type Slide = {
  config: EventConfig;
  Component: ComponentType;
};
```

**Active test:** `Date.parse(config.start) <= Date.now() && Date.now() <= Date.parse(config.end)`.
Invalid/misordered dates (`start >= end`, `NaN`) → treated as never active (guarded in the
active filter), so a malformed config can never wedge the rotation.

## Event slide file (`app/events/happy-birthday-raja.tsx`)

```tsx
"use client";
import type { EventConfig } from "./types";

export const config: EventConfig = {
  id: "happy-birthday-raja",
  start: "2026-09-12T14:00:00Z", // Sept 12, 9:00am CDT
  end: "2026-09-12T17:00:00Z",   // Sept 12, 12:00pm CDT
  durationSeconds: 60,
};

export default function HappyBirthdayRaja() {
  return <div className={/* centered stage */}>HAPPY BIRTHDAY</div>;
}
```

## Registry (`app/events/registry.ts`)

Explicit, ordered — the array order is the back-to-back play order:

```ts
import type { Slide } from "./types";
import Raja, { config as raja } from "./happy-birthday-raja";

export const slides: Slide[] = [
  { config: raja, Component: Raja },
];
```

New event = add its file + one line here.

## Rotation controller (`app/components/Rotation.tsx`, `"use client"`)

Props: `children` (the server-rendered regular `<Menu/>`).

State machine:
1. On mount and at the start of every **regular** phase, compute the active set:
   `slides.filter(s => isActive(s.config, Date.now()))`, preserving registry order.
2. **No active events** → render `children` (regular), no timers, no `AnimatePresence` churn.
3. **≥1 active** → cycle:
   `regular (60s) → active[0] (dur0) → active[1] (dur1) → … → regular (60s) → …`
   Each phase schedules a single `setTimeout` for its own duration, then advances.
   The active set is recomputed when returning to the regular phase, so events entering
   or leaving their window take effect at the next regular boundary (a slide already on
   screen finishes its duration).
4. Current screen is keyed (`"regular"` or `config.id`) and wrapped in
   `<AnimatePresence mode="popLayout">` (or `mode="wait"`), so each swap runs an exit
   then enter animation.

**Timers:** one active `setTimeout` at a time, cleared on unmount and on each transition.
Uses `Date.now()` live (not a stale mount time) when recomputing the active set.

## Transitions (Framer Motion)

Each screen is a `motion.div`:
- **enter**: from `opacity: 0, scale: 0.92, filter: "blur(12px)"` → `opacity: 1, scale: 1, filter: "blur(0px)"`.
- **exit**: to `opacity: 0, scale: 1.08, filter: "blur(16px)"` (flies forward + blurs out).
- spring/ease tuned for smoothness (~0.6–0.9s), `will-change: transform, filter, opacity`.

The stage is a full-viewport centered container so both the menu and event slides occupy
the same space and cross-fade in place.

## page.tsx

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

`<Menu/>` stays a server component (build-time prices/featured), passed as children into the
client `Rotation`.

## README (`app/events/README.md`)

Must document, with a copy-pasteable example:
- What an event slide is and the rotation rules (regular 60s gap; back-to-back when multiple
  active; nothing rotates when none active).
- **How to add a slide** (3 steps): 1) create `app/events/<id>.tsx` exporting `config` +
  default component; 2) add one line to `registry.ts`; 3) `pnpm dev` to preview, deploy to ship.
- The `EventConfig` fields, with the **UTC caveat** spelled out and a worked CST/CDT→UTC
  conversion (Sept = CDT = UTC−5; winter = CST = UTC−6).
- How to preview a slide without waiting for its window (temporarily widen `start`/`end`).
- When to promote a flat file to a folder with `index.tsx` (slide needs its own assets/CSS).
- Note that the schedule is build-time: editing a config requires a deploy to take effect.

## Verification

- `pnpm build` succeeds; `motion` resolves under vinext/Vite + React 19.
- With Raja's window widened to "now", `pnpm dev` shows: regular menu for 60s, a smooth
  blur/fly transition to "HAPPY BIRTHDAY" for 60s, then a smooth transition back — looping.
- With no active event (default dates), the page shows only the regular menu, no transitions,
  no timers firing.
- Two temporary test events both active → `regular → A → B → regular → …` (back-to-back).
- Existing behavior intact: prices/featured render, `AutoRefresh` still reloads on new build.

## Out of scope (YAGNI)

- The real Raja visual design (placeholder text only for now).
- Any admin UI / runtime schedule editing (schedule is build-time config).
- Per-slide transition overrides (one shared transition for all slides for now).
- Auto-discovery via `import.meta.glob` (explicit registry keeps play order obvious).
- Tests / test framework (consistent with the rest of the app).
