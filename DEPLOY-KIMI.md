# Deployment Guide — rtv-unified-platform

This repo contains two deployables:

| Component | Path | Target |
|---|---|---|
| Frontend (Vite + React 19) | repo root | Static host (Cloudflare Pages `rotationtv-web-app`, or Kimi Deployment Engine) |
| API worker (Hono, TypeScript) | `worker/` | Cloudflare Workers (`rtv-api`) |

---

## Kimi Deployment Engine

Use these settings when deploying the **frontend** with the Kimi Deployment Engine:

- **Root directory:** repository root
- **Build command:** `npm ci && npm run build`
- **Output directory:** `dist/`
- **Node version:** 20 or newer (`"engines": { "node": ">=20" }` is enforced in `package.json`)

### Build-time environment variables

Vite inlines `VITE_*` variables **at build time** — they must be set in the Kimi
build environment, not at runtime. Configure the full set from `.env.example`;
the important ones are:

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | yes | `https://rtv-api.<your-subdomain>.workers.dev` (or `https://api.rotationtv.network`) | Base URL of the API worker |
| `VITE_TELEGRAM_BOT_USERNAME` | if used by the login UI | `@YourBotName_bot` | Telegram bot used for Mini App login |
| `VITE_APP_NAME` | optional | `RotationTV` | Branding |

> Any other `VITE_*` variables listed in `.env.example` should be mirrored 1:1
> in the Kimi build environment. Never commit real values — `.env*` files are
> gitignored.

### SPA fallback (required)

The app uses React Router v7 with client-side routing. The host **must rewrite
all unmatched paths to `/index.html`** (HTTP 200), or deep links such as
`/channel/123` will 404 on refresh.

- The repo ships `public/_redirects` (`/*    /index.html   200`), which is
  copied into `dist/` by Vite and is honored by Cloudflare Pages and
  Netlify-compatible hosts.
- If the Kimi engine does not honor `_redirects`, configure an equivalent
  "SPA fallback / rewrite all to /index.html" rule in its dashboard.

### API & CORS

- The frontend talks to the API worker at `VITE_API_BASE_URL`:
  - default worker URL: `https://rtv-api.<your-subdomain>.workers.dev`
  - custom domain: `https://api.rotationtv.network`
- The worker's CORS allowlist already includes `*.kimi.page`, so a Kimi-hosted
  preview/production deployment can call the API without extra worker changes.
- If you deploy the frontend on a different domain, add that origin to the
  worker's CORS allowlist and redeploy the worker.

### What NOT to deploy on Kimi

The `worker/` directory is a Cloudflare Worker — it is deployed separately via
`cd worker && npx wrangler deploy --env production` (or the
`.github/workflows/deploy.yml` GitHub Action). Do not point the Kimi engine at
`worker/`.

---

## Required worker secrets (Cloudflare)

Set once with `npx wrangler secret put <NAME> --env production`:

- `TELEGRAM_BOT_TOKEN` — validates Telegram Mini App initData
- `JWT_SECRET` — signs session tokens (`rtv1.*`)
- `ADMIN_SECRET` — admin endpoints
- `TELEGRAM_INITDATA_MAX_AGE` (optional) — initData freshness window in seconds (default `86400`)

See `worker/wrangler.toml` for bindings and the optional commented-out
`KV_TOKENS` namespace block.

---

## GitHub Actions

`.github/workflows/deploy.yml` deploys both components on every push to `main`
(Node 20). Required GitHub secrets: `CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`. Build-time frontend values (e.g. `VITE_API_BASE_URL`)
come from repository **variables**.

> NOTE: the workflow file ships in this branch as `deploy.workflow.yml`
> (repo-root). Move it to `.github/workflows/deploy.yml` to activate — the
> automation token used to author this PR lacks the `workflows` permission
> needed to write under `.github/workflows/` directly.
