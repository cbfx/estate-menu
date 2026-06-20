# estate-menu

A [vinext](https://github.com/cloudflare/vinext) (Vite-based Next.js) App Router app that deploys to **Cloudflare Workers** via GitHub Actions on merge to `main`.

The application itself is a placeholder — this repo is the deploy-ready scaffold.

## Local development

```bash
pnpm install
pnpm dev      # vinext dev — http://localhost:3000
pnpm build    # vinext build
```

## Deployment

CI (`.github/workflows/deploy.yml`) runs on every push to `main`, inside the GitHub **production** Environment, and deploys to Cloudflare Workers. It runs `pnpm build` and then `wrangler deploy` (the build step regenerates the redirected Wrangler config that the deploy consumes).

### Making CI go green — required secrets

The pipeline is intentionally wired to **fail at the Cloudflare auth step until two secrets exist**. Add them to the GitHub **production** environment (Settings → Environments → New environment → `production` → Add secret):

| Secret | Where to get it |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → right sidebar Account ID |

Until both are set, the deploy run will check out, install, build, and then fail on the deploy step — which confirms the pipeline is correctly assembled.

## First push

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

Then open the repo's **Actions** tab to watch the run fail at deploy (expected), add the two secrets above, and re-run to deploy for real.
