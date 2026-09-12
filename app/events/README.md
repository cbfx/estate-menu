# Event slides (rotating secondary menus)

The kiosk normally shows the regular coffee menu. During an event's time window, the
display **rotates** between the regular menu and one or more event slides.

## Rotation rules

- When **no** event is active, only the regular menu shows; a lightweight 60s poll keeps re-checking for event windows to begin.
- When one or more events are active:
  `regular (60s) → event A → event B → … → regular (60s) → …`
  Active events play **back-to-back** (in registry order), separated by one 60s regular phase.
- An event is "active" when `now` is within its `start`–`end` window.
- Events entering/leaving their window take effect at the next regular phase; a slide already
  on screen finishes its configured duration first.
- Transitions between screens fade + blur + fly-forward (Framer Motion).

## Add a slide (3 steps)

Each slide owns its markup AND its styles. Create two files:

**1a. `app/events/<your-id>.module.css`** — this slide's own scoped styles:

```css
.slide {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.headline {
  font-size: clamp(64px, 12vw, 200px);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1;
}
```

**1b. `app/events/<your-id>.tsx`** exporting a `config` and a default component, importing its own module:

```tsx
"use client";

import type { EventConfig } from "./types";
import styles from "./summer-launch.module.css";

export const config: EventConfig = {
  id: "summer-launch",
  start: "2026-07-01T13:00:00Z", // see UTC note below
  end: "2026-07-01T20:00:00Z",
  durationSeconds: 45,
};

export default function SummerLaunch() {
  return (
    <div className={styles.slide}>
      <div className={styles.headline}>SUMMER MENU IS HERE</div>
    </div>
  );
}
```

There is no shared slide stylesheet — each slide's CSS is scoped to that slide only.

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

A slide is a pair of flat files (`.tsx` + `.module.css`) until it needs its own image assets.
When it does, promote it to a folder with an `index.tsx` (same exports) and keep its
image/CSS alongside:

```
app/events/summer-launch/
├── index.tsx      # exports `config` + default component
├── hero.jpg
└── summer.module.css
```

The registry import path (`./summer-launch`) stays the same.
