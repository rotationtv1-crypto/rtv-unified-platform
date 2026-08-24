# Deployment Guide

## Prerequisites

- Cloudflare account
- Telegram Bot (create via @BotFather)
- GitHub account

## 1. Cloudflare Setup

### Create D1 Database
```bash
npx wrangler d1 create rtv-prod-db
```
Note the database ID and update `worker/wrangler.toml`.

### Create KV Namespaces
```bash
npx wrangler kv:namespace create "KV_RATE_LIMIT"
npx wrangler kv:namespace create "KV_CACHE"
```
Update the IDs in `worker/wrangler.toml`.

### Set Secrets
```bash
cd worker
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put RTV_API_SECRET
npx wrangler secret put ADMIN_SECRET
```

## 2. Database Migration

```bash
cd worker
npx wrangler d1 migrations apply rtv-prod-db
```

## 3. Deploy Worker

```bash
cd worker
npx wrangler deploy
```

## 4. Frontend Build

```bash
cd frontend
npm install
npm run build
```

Deploy the `dist/` folder to Cloudflare Pages or your preferred static host.

## 5. GitHub Actions (Optional)

Add these secrets to your GitHub repository:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The CI workflow will auto-run on push to main/develop.

## Testing

```bash
# Health check
curl https://your-worker.workers.dev/health

# List channels
curl https://your-worker.workers.dev/api/channels
```

## Live Resources

- **Frontend**: https://mcky5iohe4u.kimi.page
- **D1 DB ID**: `4c51f100-3de8-4fc2-a355-08ae412077e9`
- **KV_RATE_LIMIT ID**: `96e51e2e7a1040e58d794c5f70d74d9d`
- **KV_CACHE ID**: `5bcff7ee359a4422b35d800e4ebae80e`
