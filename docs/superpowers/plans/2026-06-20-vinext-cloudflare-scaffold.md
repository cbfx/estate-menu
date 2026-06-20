# vinext → Cloudflare Workers Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a bare vinext (Vite-based Next.js) App Router app that deploys to Cloudflare Workers via a GitHub Actions workflow on merge to `main`, wired so that a push with no secrets set runs CI and fails at the Cloudflare auth step.

**Architecture:** Scaffold a default `create-next-app` App Router project, migrate it to vinext (`vinext init` + RSC `vite.config.ts`), strip the starter page to a minimal placeholder, generate and commit the Cloudflare Worker config (`wrangler.jsonc`, `worker/index.ts`) that vinext produces, and add one GitHub Actions workflow that builds and runs `wrangler deploy` inside a `production` GitHub Environment.

**Tech Stack:** vinext, Vite 7, React 19, `@vitejs/plugin-rsc`, pnpm, Wrangler, GitHub Actions (`cloudflare/wrangler-action`), Node 22.

**Note on "tests":** This is infrastructure scaffolding, not application logic, so there are no unit tests. Each task's verification is a concrete command with expected output (does dev serve, does build succeed, does dry-run validate, is the workflow valid YAML). Treat those verification commands as the task's passing gate — do not proceed until they pass.

**Working directory:** `/Users/cbfx/code/cbfx/estate-menu` (already a git repo on branch `main`, contains only `docs/` and the committed spec).

**vinext is experimental.** Where a documented command's behavior is uncertain (notably config generation), the task says how to verify and what the fallback is. Always trust the live result over this plan; the verification gate is the source of truth.

---

### Task 1: Scaffold the Next.js App Router base into the repo

The repo dir is non-empty (`docs/`, `.git`), so `create-next-app .` would abort. Scaffold into a sibling temp dir, strip its `.git`/`node_modules`, then copy contents in.

**Files:**
- Create: `app/`, `public/`, `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `.gitignore` (all from create-next-app)

- [ ] **Step 1: Scaffold into a temp dir**

```bash
cd /Users/cbfx/code/cbfx
pnpm create next-app@latest estate-menu-scaffold \
  --ts --app --no-src-dir --no-tailwind --no-eslint \
  --import-alias "@/*" --use-pnpm --yes
```

Expected: completes, prints "Success! Created estate-menu-scaffold". If it still prompts for an option, add the matching `--no-<option>` flag and re-run.

- [ ] **Step 2: Strip git + deps from the scaffold, copy contents into the repo**

```bash
rm -rf estate-menu-scaffold/.git estate-menu-scaffold/node_modules
cp -R estate-menu-scaffold/. /Users/cbfx/code/cbfx/estate-menu/
rm -rf estate-menu-scaffold
cd /Users/cbfx/code/cbfx/estate-menu
```

Expected: `ls` in the repo now shows `app/`, `public/`, `package.json`, `tsconfig.json`, `next.config.ts`, plus the existing `docs/`.

- [ ] **Step 3: Install dependencies (generates pnpm-lock.yaml)**

```bash
pnpm install
```

Expected: completes, creates `node_modules/` and `pnpm-lock.yaml`.

- [ ] **Step 4: Verify the base Next.js app type-checks**

Run: `pnpm exec tsc --noEmit`
Expected: exits 0 (no type errors).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js App Router base"
```

---

### Task 2: Migrate to vinext

Install vinext + RSC deps, run `vinext init`, set the dev/build/start scripts to vinext, and add the App Router RSC `vite.config.ts`.

**Files:**
- Create: `vite.config.ts`
- Modify: `package.json` (deps + scripts)

- [ ] **Step 1: Install vinext runtime + RSC plugin**

```bash
pnpm add vinext react@^19.2.0 react-dom@^19.2.0 vite@^7.0.0
pnpm add -D @vitejs/plugin-rsc
```

Expected: completes; `vinext`, `vite` in `dependencies`, `@vitejs/plugin-rsc` in `devDependencies`.

- [ ] **Step 2: Run the vinext migration**

```bash
pnpm exec vinext init --force
```

Expected: prints what it migrated. If `--force` is rejected, run `pnpm exec vinext init` and accept prompts. `vinext init` may add `dev:vinext`/`build:vinext` scripts — that's fine; the next step overrides scripts to the canonical names.

- [ ] **Step 3: Set the canonical scripts in `package.json`**

Replace the `"scripts"` block so it reads exactly:

```json
"scripts": {
  "dev": "vinext dev",
  "build": "vinext build",
  "start": "vinext start",
  "deploy": "vinext deploy"
}
```

(Remove any leftover `next` / `dev:vinext` / `build:vinext` scripts that `create-next-app` or `vinext init` added.)

- [ ] **Step 4: Create `vite.config.ts` for App Router with RSC**

```ts
import { defineConfig } from "vite";
import vinext from "vinext";
import rsc from "@vitejs/plugin-rsc";

export default defineConfig({
  plugins: [
    vinext(),
    rsc({
      entries: {
        rsc: "virtual:vinext-rsc-entry",
        ssr: "virtual:vinext-app-ssr-entry",
        client: "virtual:vinext-app-browser-entry",
      },
    }),
  ],
});
```

- [ ] **Step 5: Verify the vinext dev server serves the page (primary gate)**

```bash
pnpm dev &
DEV_PID=$!
sleep 8
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000
kill $DEV_PID
```

Expected: prints `200`. (If vinext serves on a different port, read the port from the `pnpm dev` output and curl that.) If this fails, the dep versions or `vite.config.ts` are wrong — fix before continuing; consult https://github.com/cloudflare/vinext and https://cloudflare-vinext.mintlify.app/quickstart. **Do not proceed past a non-200.**

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: migrate app to vinext (App Router + RSC)"
```

---

### Task 3: Reduce the starter page to a bare placeholder

The create-next-app default page pulls in `next/image` and `next/font/google`. Replace it with a minimal page so the scaffold is bare and avoids exercising experimental vinext surface the user hasn't asked for. The real app is designed later.

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css` (reduce to minimal reset; keep the file since layout imports it)

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main>
      <h1>estate-menu</h1>
      <p>vinext + Cloudflare Workers scaffold. App to be designed.</p>
    </main>
  );
}
```

- [ ] **Step 2: Replace `app/layout.tsx`** (drop the next/font import)

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "estate-menu",
  description: "vinext + Cloudflare Workers scaffold",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Replace `app/globals.css`** with a minimal reset

```css
:root {
  color-scheme: light dark;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  padding: 2rem;
}
```

- [ ] **Step 4: Verify dev still serves the simplified page**

```bash
pnpm dev &
DEV_PID=$!
sleep 8
curl -sS http://localhost:3000 | grep -q "estate-menu" && echo OK
kill $DEV_PID
```

Expected: prints `OK`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: reduce starter page to bare placeholder"
```

---

### Task 4: Generate and commit the Cloudflare Worker config

vinext auto-generates `vite.config.ts` (already present), `wrangler.jsonc`, and `worker/index.ts` during `vinext deploy`. Generation happens before authentication, so running deploy without credentials should leave the generated config behind and then fail at auth. Commit the generated files so CI can run a plain `wrangler deploy`.

**Files:**
- Create: `wrangler.jsonc` (generated by vinext)
- Create: `worker/index.ts` (generated by vinext)
- Modify: `wrangler.jsonc` (set `name`, remove any account id)

- [ ] **Step 1: Add wrangler as a dev dependency** (needed for the dry-run and as the CI deploy tool)

```bash
pnpm add -D wrangler
```

- [ ] **Step 2: Trigger config generation by running deploy without credentials**

```bash
env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_ACCOUNT_ID pnpm exec vinext deploy 2>&1 | tail -20
```

Expected: vinext builds and generates `wrangler.jsonc` + `worker/index.ts`, then fails with an authentication/login error. Confirm the files exist:

```bash
ls wrangler.jsonc worker/index.ts
```

If `vinext deploy` errors out *before* generating the files (e.g. demands `wrangler login` first), fall back: copy the templates from the vinext source. Read the generated-file templates in the `cloudflare/vinext` repo (the deploy/scaffold module under https://github.com/cloudflare/vinext) and write `wrangler.jsonc` and `worker/index.ts` to match exactly what `vinext deploy` would emit for this project. Do not invent contents — obtain the real template.

- [ ] **Step 3: Set the worker name and ensure no account id is committed**

Open `wrangler.jsonc`. Ensure:
- `"name": "estate-menu"`
- There is **no** `"account_id"` key (delete it if vinext added one — the account id comes from the `CLOUDFLARE_ACCOUNT_ID` secret in CI).
- Leave vinext's generated `main`, `compatibility_date`, `compatibility_flags`, and `assets`/build settings as-is.

- [ ] **Step 4: Verify the build produces deployable output**

```bash
pnpm build
```

Expected: `vinext build` completes and writes the output directory referenced by `wrangler.jsonc`.

- [ ] **Step 5: Validate the wrangler config with no credentials (dry run)**

```bash
pnpm exec wrangler deploy --dry-run 2>&1 | tail -20
```

Expected: wrangler parses `wrangler.jsonc` and reports what it *would* upload, exiting 0 without contacting the API. A `--dry-run` that prints the worker + assets and does not error confirms the config is valid. If `wrangler deploy --dry-run` is incompatible with vinext's output layout, record this in the README runbook (Task 6) and note that CI will use `vinext deploy` instead of `wrangler deploy` — both fail identically on missing credentials, satisfying the goal.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Cloudflare Worker config (wrangler.jsonc, worker entry)"
```

---

### Task 5: Add the deploy-on-merge GitHub Actions workflow

One workflow, triggered on push to `main`, scoped to the `production` GitHub Environment, that builds and deploys via `cloudflare/wrangler-action`.

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
```

Note: `pnpm/action-setup@v4` reads the pnpm version from the `packageManager` field in `package.json` (added in the next step). If during Task 4 Step 5 you determined `wrangler deploy` is incompatible, change the last step to `run: pnpm exec vinext deploy` with `env: { CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}, CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }} }` instead of the wrangler-action step.

- [ ] **Step 2: Pin the pnpm version for CI**

```bash
echo "packageManager set to pnpm@$(pnpm --version)"
```

Add a top-level `"packageManager": "pnpm@<version>"` field to `package.json` using the exact version printed (e.g. `"pnpm@9.12.0"`).

- [ ] **Step 3: Verify the workflow is valid YAML**

```bash
pnpm dlx js-yaml .github/workflows/deploy.yml > /dev/null && echo "valid yaml"
```

Expected: prints `valid yaml`. If `actionlint` is available (`which actionlint`), also run `actionlint .github/workflows/deploy.yml` and expect no errors.

- [ ] **Step 4: Confirm the deploy job references the production environment and correct secret names**

```bash
grep -q "environment: production" .github/workflows/deploy.yml \
  && grep -q "CLOUDFLARE_API_TOKEN" .github/workflows/deploy.yml \
  && grep -q "CLOUDFLARE_ACCOUNT_ID" .github/workflows/deploy.yml \
  && echo "wired"
```

Expected: prints `wired`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "ci: deploy to Cloudflare Workers on merge to main"
```

---

### Task 6: Finalize .gitignore, write README runbook, final verification

**Files:**
- Modify: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Append vinext/wrangler ignores to `.gitignore`**

Append (only if not already present):

```gitignore
# vinext / vite build output
.vinext/
dist/

# wrangler
.wrangler/
.dev.vars

# env
.env
.env.*
!.env.example
```

Then confirm the committed config files are NOT ignored:

```bash
git check-ignore wrangler.jsonc worker/index.ts vite.config.ts; echo "exit=$?"
```

Expected: prints `exit=1` (none of them are ignored). If any are listed, narrow the `.gitignore` rule that caught them.

- [ ] **Step 2: Write `README.md`**

```markdown
# estate-menu

A [vinext](https://github.com/cloudflare/vinext) (Vite-based Next.js) App Router app that
deploys to **Cloudflare Workers** via GitHub Actions on merge to `main`.

The application itself is a placeholder — this repo is the deploy-ready scaffold.

## Local development

```bash
pnpm install
pnpm dev      # vinext dev — http://localhost:3000
pnpm build    # vinext build
```

## Deployment

CI (`.github/workflows/deploy.yml`) runs on every push to `main`, inside the GitHub
**production** Environment, and deploys to Cloudflare Workers.

### Making CI go green — required secrets

The pipeline is intentionally wired to **fail at the Cloudflare auth step until two secrets
exist**. Add them to the GitHub **production** environment
(Settings → Environments → New environment → `production` → Add secret):

| Secret | Where to get it |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → right sidebar Account ID |

Until both are set, the deploy run will check out, install, build, and then fail on the
deploy step — which confirms the pipeline is correctly assembled.

## First push

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

Then open the repo's **Actions** tab to watch the run fail at deploy (expected), add the two
secrets above, and re-run to deploy for real.
```

(Replace the triple-backtick fences correctly when writing the file — the README contains
nested code blocks.)

- [ ] **Step 3: Final full verification**

```bash
pnpm install --frozen-lockfile && pnpm build && echo "BUILD OK"
```

Expected: prints `BUILD OK` (this mirrors what CI does up to the deploy step).

- [ ] **Step 4: Confirm the working tree is clean and the tracked file set is correct**

```bash
git add -A && git status --short
git ls-files | grep -E "deploy.yml|wrangler.jsonc|worker/index.ts|vite.config.ts|README.md"
```

Expected: the second command lists all five files.

- [ ] **Step 5: Commit**

```bash
git commit -m "docs: add README runbook and finalize gitignore"
```

---

## Definition of Done

- `pnpm dev` serves the placeholder page locally (Task 2/3).
- `pnpm build` succeeds (Task 4/6).
- `wrangler deploy --dry-run` validates the config with no credentials, OR the README documents the `vinext deploy` CI fallback (Task 4).
- `.github/workflows/deploy.yml` is valid, triggers on push to `main`, is scoped to `environment: production`, and references `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (Task 5).
- README documents the two secrets and the expected first-run failure (Task 6).

**User's final manual check (outside this plan — no GitHub remote here):** create a GitHub repo, push `main`, watch Actions run and fail at the Cloudflare auth step, add the two secrets, re-run to deploy green.
