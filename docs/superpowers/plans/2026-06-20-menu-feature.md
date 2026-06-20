# Menu Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder home page with the coffee menu UI, decomposed into a typed data file, presentational components, and scoped CSS, runnable via `pnpm dev`.

**Architecture:** Menu content lives in `app/menu-data.ts` as typed rows. A single `MenuRow` presentational component renders any row (price + name) and selects its typographic scale from a CSS Module via a `kind` prop. `Menu.tsx` composes the two-column layout by mapping the data. The dark theme + DM Sans font go in `globals.css` and the root layout; `page.tsx` renders `<Menu />`.

**Tech Stack:** vinext (Vite + React 19, App Router, RSC), CSS Modules, DM Sans via Google Fonts `<link>`.

**No unit tests:** the scaffold has no test framework and this is static presentational UI (per the spec). Each task's verification is `tsc`/`pnpm build`/dev-server render — treat those as the passing gate.

**Working directory:** `/Users/cbfx/code/cbfx/estate-menu` (git repo, branch `main`, clean tree). pnpm. `pnpm dev` serves on http://localhost:3000.

---

### Task 1: Menu data

**Files:**
- Create: `app/menu-data.ts`

- [ ] **Step 1: Create `app/menu-data.ts`** with exactly:

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

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm exec tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add app/menu-data.ts
git commit -m "feat: add menu data"
```

---

### Task 2: Menu component + scoped styles

**Files:**
- Create: `app/menu.module.css`
- Create: `app/components/MenuRow.tsx`
- Create: `app/components/Menu.tsx`

- [ ] **Step 1: Create `app/menu.module.css`** with exactly (descendant selectors mirror the source's `.espresso-item .price` structure; both class names are hashed within the module so the nesting resolves):

```css
.container {
  width: 100%;
  max-width: 1400px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: start;
}

.primaryColumn,
.secondaryColumn {
  padding-top: 20px;
}

.espressoSection {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.espressoItem {
  display: flex;
  align-items: flex-start;
  font-size: 76px;
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.espressoItem .name {
  color: #ffffff;
  line-height: 0.85;
  display: inline-block;
  margin-bottom: 6px;
}

.espressoItem .price {
  font-weight: 400;
  margin-right: 16px;
  font-size: 26px;
  width: 60px;
  color: #ffffff;
  opacity: 0.6;
  line-height: 1;
  display: flex;
  align-items: flex-start;
}

.addon {
  display: flex;
  align-items: flex-start;
  font-size: 22px;
  font-weight: 400;
  line-height: 1.3;
}

.addon .name {
  color: #ffffff;
  line-height: 1.3;
}

.addon .price {
  font-weight: 400;
  margin-right: 16px;
  width: 60px;
  color: #ffffff;
  opacity: 0.6;
  line-height: 1.3;
}

.section {
  margin-bottom: 48px;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item {
  display: flex;
  align-items: flex-start;
  font-size: 26px;
  font-weight: 400;
  color: #ffffff;
  line-height: 1.3;
}

.item .name {
  color: #ffffff;
  line-height: 1.3;
}

.item .price {
  font-weight: 500;
  margin-right: 20px;
  color: #ffffff;
  opacity: 0.6;
  line-height: 1.3;
}

@media (max-width: 968px) {
  .container {
    grid-template-columns: 1fr;
    gap: 60px;
    max-width: 600px;
  }
  .espressoItem {
    font-size: 44px;
  }
}
```

- [ ] **Step 2: Create `app/components/MenuRow.tsx`** with exactly:

```tsx
import styles from "../menu.module.css";
import type { Row, RowKind } from "../menu-data";

const rowClass: Record<RowKind, string> = {
  espresso: styles.espressoItem,
  addon: styles.addon,
  item: styles.item,
};

export default function MenuRow({ price, name, kind }: Row) {
  return (
    <div className={rowClass[kind]}>
      <span className={styles.price}>{price}</span>
      <span className={styles.name}>{name}</span>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/components/Menu.tsx`** with exactly:

```tsx
import styles from "../menu.module.css";
import { espresso, sections } from "../menu-data";
import MenuRow from "./MenuRow";

export default function Menu() {
  return (
    <div className={styles.container}>
      <div className={styles.primaryColumn}>
        <div className={styles.espressoSection}>
          {espresso.map((row, i) => (
            <MenuRow key={i} {...row} />
          ))}
        </div>
      </div>
      <div className={styles.secondaryColumn}>
        {sections.map((rows, i) => (
          <div key={i} className={styles.section}>
            <div className={styles.items}>
              {rows.map((row, j) => (
                <MenuRow key={j} {...row} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify it type-checks**

Run: `pnpm exec tsc --noEmit`
Expected: exits 0. (CSS Module imports resolve via vinext/Vite's type handling; if `tsc` complains about the `.css` import having no type, that is acceptable only if it is the sole error and the dev/build steps in Task 3 succeed — note it and continue. Do not fix by adding ad-hoc module declarations unless Task 3 fails.)

- [ ] **Step 5: Commit**

```bash
git add app/menu.module.css app/components/MenuRow.tsx app/components/Menu.tsx
git commit -m "feat: add Menu component and scoped styles"
```

---

### Task 3: Wire up theme, font, and page

**Files:**
- Modify: `app/globals.css` (replace contents)
- Modify: `app/layout.tsx` (font links + title)
- Modify: `app/page.tsx` (render `<Menu />`)

- [ ] **Step 1: Replace `app/globals.css`** entirely with:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "DM Sans", sans-serif;
  background: #000000;
  color: #ffffff;
  line-height: 1.618;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}
```

- [ ] **Step 2: Replace `app/layout.tsx`** entirely with:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Menu",
  description: "Coffee menu",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

Note: this uses a literal `<head>` in the root layout. React 19 also auto-hoists `<link>` tags. If vinext errors on the `<head>` element when you run dev (Step 4), remove the `<head>` wrapper and render the three `<link>` tags directly as the first children inside `<body>` (React 19 hoists them) — verify DM Sans still loads. Report whichever form you used.

- [ ] **Step 3: Replace `app/page.tsx`** entirely with:

```tsx
import Menu from "./components/Menu";

export default function Home() {
  return <Menu />;
}
```

- [ ] **Step 4: Verify the dev server renders the menu**

```bash
pnpm dev &
DEV_PID=$!
sleep 8
echo "--- names present? ---"
curl -sS http://localhost:3000 | grep -c -E "Espresso|Macchiato|Cortado|Cappuccino|Latte|Americano|Cold brew|Matcha|Chai|Hibiscus"
echo "--- addon present? ---"
curl -sS http://localhost:3000 | grep -q "Honey lavender" && echo "ADDON OK"
echo "--- DM Sans link present? ---"
curl -sS http://localhost:3000 | grep -q "DM+Sans" && echo "FONT LINK OK"
kill $DEV_PID
```

Expected: the names count is `>= 1` (several matches), `ADDON OK`, and `FONT LINK OK`. If the font link is missing, apply the Step 2 fallback. Do not report DONE unless all three checks pass.

- [ ] **Step 5: Verify the production build succeeds**

```bash
pnpm build
```

Expected: `vinext build` completes with exit 0 (mirrors CI up to deploy).

- [ ] **Step 6: Commit**

```bash
git add app/globals.css app/layout.tsx app/page.tsx
git commit -m "feat: render menu on home page with dark theme and DM Sans"
```

---

## Definition of Done

- `app/menu-data.ts` holds all menu content as typed `Row`s (Task 1).
- `MenuRow` + `Menu` render the two-column layout from the data; `menu.module.css` reproduces the source's scales including the shown `addon` line (Task 2).
- `globals.css` carries the dark theme; the layout loads DM Sans; `page.tsx` renders `<Menu />` (Task 3).
- `pnpm dev` shows the menu with all drink names, the addon flavor line, and DM Sans; `pnpm build` succeeds (Task 3 Steps 4–5).
- Manual visual check (the user's): two columns, muted prices, single-column collapse below 968px.
