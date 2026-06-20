# Menu feature design

**Date:** 2026-06-20
**Status:** Approved, pending implementation plan

## Goal

Replace the bare placeholder home page with the coffee menu UI provided as a single HTML
file, decomposed thoughtfully into data + components + scoped styles in the vinext App
Router app, runnable locally with `pnpm dev`.

## Decisions (confirmed with user)

| Decision | Choice |
|---|---|
| Content structure | Typed data file (`app/menu-data.ts`) + presentational components |
| Styling | CSS Module for the component (`app/menu.module.css`) + global theme in `globals.css` |
| Hidden variant row | **Show it**, styled as a smaller add-on annotation (not at 76px espresso scale) |
| Font | Google Fonts `<link>` (DM Sans) in the root layout — not `next/font/google` (vinext partial support) |
| Tests | None — no test framework in the scaffold; static presentational UI does not warrant adding one. Verification is visual (dev server) + `pnpm build` |

## File structure

```
app/
├── menu-data.ts          # typed menu content — single source of truth
├── components/
│   ├── Menu.tsx          # composes .container + both columns, maps data → rows
│   └── MenuRow.tsx       # one price+name row; kind = "espresso" | "addon" | "item"
├── menu.module.css       # scoped: grid, columns, sections, row sizing, responsive
├── globals.css           # REPLACED: reset + dark theme + DM Sans + body centering
├── layout.tsx            # add DM Sans <link>s; title → "Menu"
└── page.tsx              # renders <Menu />
```

All components are React Server Components (no interactivity).

## Data model (`app/menu-data.ts`)

```ts
export type RowKind = "espresso" | "addon" | "item";
export type Row = { price: string; name: string; kind: RowKind };

// Left column — preserves the source ordering: 5 drinks, the +0.50 addon, then Americano.
export const espresso: Row[] = [
  { price: "3.25", name: "Espresso", kind: "espresso" },
  { price: "3.50", name: "Macchiato", kind: "espresso" },
  { price: "3.75", name: "Cortado", kind: "espresso" },
  { price: "4.00", name: "Cappuccino", kind: "espresso" },
  { price: "4.50", name: "Latte", kind: "espresso" },
  { price: "+0.50", name: "Honey lavender, mocha, vanilla, kentucky smoke", kind: "addon" },
  { price: "3.50", name: "Americano", kind: "espresso" },
];

// Right column — three sections.
export const sections: Row[][] = [
  [
    { price: "8.00", name: "Espresso OF", kind: "item" },
    { price: "4.50", name: "Cold brew shandy", kind: "item" },
    { price: "4.50", name: "Matcha lemonade", kind: "item" },
    { price: "4.50", name: "Cold brew cola", kind: "item" },
    { price: "4.50", name: "Lime espresso tonic", kind: "item" },
  ],
  [
    { price: "4.00", name: "Chai", kind: "item" },
    { price: "4.75", name: "Matcha latte", kind: "item" },
  ],
  [
    { price: "3.50", name: "Hibiscus, chamomile, chai, green, black", kind: "item" },
  ],
];
```

## Components

### `MenuRow.tsx`
Presentational. Props: `{ price: string; name: string; kind: RowKind }`. Renders
`<div class={rowClass}><span class={price}>{price}</span><span class={name}>{name}</span></div>`
where `rowClass` is the CSS-module class chosen by `kind` (`espressoItem` | `addon` | `item`).
The price/name span structure is identical across all three kinds — only the container class
(and thus the typographic scale) differs.

### `Menu.tsx`
Default export rendering `<div class={container}>`:
- Left `.primaryColumn` → `.espressoSection` mapping `espresso` → `<MenuRow>`.
- Right `.secondaryColumn` → one `.section` per entry in `sections`, each with `.items`
  mapping its rows → `<MenuRow kind="item">`.
Imports `menu-data` and `menu.module.css`.

## Styling

### `globals.css` (REPLACED — app theme, global scope)
- `* { margin: 0; padding: 0; box-sizing: border-box; }`
- `body`: `font-family: 'DM Sans', sans-serif; background:#000; color:#fff; line-height:1.618;
  min-height:100vh; display:flex; align-items:center; justify-content:center; padding:40px;`
- The current `:root { color-scheme: light dark }` light reset is removed (the app is dark).

### `app/menu.module.css` (scoped to the component)
Ported verbatim from the source `<style>`, camelCased, scoped:
- `.container` — `max-width:1400px; display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:start;`
- `.primaryColumn`, `.secondaryColumn` — `padding-top:20px;`
- `.espressoSection` — column flex, `gap:20px`
- `.espressoItem` — `font-size:76px; font-weight:400; letter-spacing:-0.02em; line-height:1.1; display:flex; align-items:flex-start;` with `.name` (`line-height:.85`) and `.price` (`font-size:26px; width:60px; opacity:.60; margin-right:16px;`)
- `.addon` — the shown variant: `display:flex; align-items:flex-start; font-size:22px;` reusing
  the same `.price`/`.name` spans at the smaller scale so the long flavor list reads as an
  annotation under Latte rather than at 76px. `.price` keeps `opacity:.60`.
- `.section` — `margin-bottom:48px`
- `.items` — column flex, `gap:12px`
- `.item` — `font-size:26px; display:flex; align-items:flex-start;` with `.name`
  (`line-height:1.3`) and `.price` (`font-weight:500; margin-right:20px; opacity:.60;`)
- `@media (max-width:968px)` — `.container { grid-template-columns:1fr; gap:60px; max-width:600px; }`
  and `.espressoItem { font-size:44px; }`

Note: the source uses one shared `.price`/`.name` pair with different sizes per context. In the
module, `.price`/`.name` are defined per-kind (nested under `.espressoItem`, `.addon`, `.item`)
to keep the existing visual scales.

## Layout & font (`app/layout.tsx`)

- Set `metadata.title` to `"Menu"`.
- Add to the rendered tree (root layout `<head>`): the two `preconnect` links and the
  DM Sans stylesheet link, exactly as in the source HTML:
  - `<link rel="preconnect" href="https://fonts.googleapis.com" />`
  - `<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />`
  - `<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />`

## `page.tsx`

```tsx
import Menu from "./components/Menu";
export default function Home() {
  return <Menu />;
}
```

## Verification

Local (the user's primary loop):
- `pnpm dev` → `http://localhost:3000` shows: two columns; DM Sans; black background; white
  text with muted (opacity .60) prices; the espresso list at 76px; the add-on flavor line
  readable under Latte; the right column's three sections with 26px items.
- Narrow the viewport below 968px → layout collapses to a single column, espresso drops to 44px.
- `pnpm build` succeeds (mirrors CI up to deploy).

## Out of scope (YAGNI)

- Any test framework / unit tests.
- CMS / dynamic data / admin editing — the menu is static data in a file.
- Theme toggling, animations, i18n.
- Cloudflare deploy changes — the existing pipeline already builds and ships `app/`.
