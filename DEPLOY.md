# Deployment Guide — RotationTV Unified Platform v2

Complete deployment instructions for the unified frontend (Telegram Mini App + standalone web) and Cloudflare Worker backend.

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Telegram Bot](https://t.me/BotFather) — create a bot, get the token
- Node.js 20+ and npm
- Git

## 1. Cloudflare Infrastructure Setup

### 1.1 Create D1 Database

```bash
cd worker
npx wrangler d1 create rtv-prod-db
```

Note the `database_id` and update `wrangler.toml`:

```toml
[[env.production.d1_databases]]
binding = "DB"
database_name = "rtv-prod-db"
database_id = "your-database-id"
```

### 1.2 Create KV Namespaces

```bash
npx wrangler kv:namespace create "KV_RATE_LIMIT"
npx wrangler kv:namespace create "KV_CACHE"
npx wrangler kv:namespace create "KV_TOKENS"
```

Update the IDs in `wrangler.toml` under `[env.production]`.

### 1.3 Set Worker Secrets

```bash
cd worker

# Required
npx wrangler secret put TELEGRAM_BOT_TOKEN --env production
npx wrangler secret put JWT_SECRET --env production
npx wrangler secret put ENCRYPTION_KEY --env production

# Cloudflare Stream (for live inputs + VOD)
npx wrangler secret put CF_STREAM_API_TOKEN --env production
npx wrangler secret put CF_ACCOUNT_ID --env production

# Admin
npx wrangler secret put ADMIN_SECRET --env production
npx wrangler secret put RTV_API_SECRET --env production
```

**Getting `CF_STREAM_API_TOKEN`:**
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create Token > Custom token
3. Permissions: Account > Cloudflare Stream > Edit
4. Include: All accounts

## 2. Database Migration

Apply the schema including Cloudflare Stream tables:

```bash
cd worker
npx wrangler d1 migrations apply rtv-prod-db --env production
```

This creates:
- `users`, `channels`, `streams`, `vod`, `tips`, `payouts`
- `bot_registrations` (multi-bot gateway)
- `cloudflare_live_inputs` (Stream live inputs)
- `cloudflare_vod` (Stream VOD assets)

## 3. Deploy the Worker

```bash
cd worker
npx wrangler deploy --env production
```

The worker will be available at `https://rtv-api.your-subdomain.workers.dev`.

### Verify Deployment

```bash
# Health check
curl https://rtv-api.your-subdomain.workers.dev/health

# List channels
curl https://rtv-api.your-subdomain.workers.dev/api/channels

# List live inputs (requires auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://rtv-api.your-subdomain.workers.dev/api/streaming/live-inputs
```

## 4. Build & Deploy Frontend

### 4.1 Build

```bash
cd frontend
npm install
npm run build
```

### 4.2 Deploy to Cloudflare Pages

Option A: Direct upload
```bash
npx wrangler pages deploy dist --project-name=rotationtv-web-app
```

Option B: Git integration
1. Push to GitHub
2. In Cloudflare Dashboard > Pages > Create a project
3. Connect your GitHub repo
4. Build settings:
   - Build command: `cd frontend && npm run build`
   - Build output: `frontend/dist`

Option C: Drag-and-drop
1. Zip the `frontend/dist` folder
2. Upload via Cloudflare Dashboard > Pages

### 4.3 Configure CORS

Ensure the worker's CORS origin includes your frontend domain:

```typescript
// worker/src/index.ts
app.use('*', cors({
  origin: [
    'https://rotationtv.network',
    'https://*.pages.dev',
    'https://*.workers.dev',
    'https://t.me',
    'https://*.kimi.page',        // your deployed frontend
  ],
  // ...
}))
```

## 5. Telegram Mini App Setup

### 5.1 Configure Bot Web App

In @BotFather:
1. `/mybots` → select your bot
2. Bot Settings > Menu Button > Configure menu button
3. Set button text: "Open RotationTV"
4. Set URL: `https://your-frontend.pages.dev`

### 5.2 Set Webhook

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://rtv-api.your-subdomain.workers.dev/telegram/webhook/<BOT_ID>",
    "allowed_updates": ["message", "callback_query", "inline_query"]
  }'
```

### 5.3 Register the Bot

```bash
curl -X POST "https://rtv-api.your-subdomain.workers.dev/telegram/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_SECRET>" \
  -d '{
    "bot_id": "your_bot_username",
    "bot_token": "YOUR_BOT_TOKEN",
    "name": "RotationTV Main Bot"
  }'
```

## 6. Domain Setup (Optional)

### Custom Domain for Pages

1. Cloudflare Dashboard > Pages > your project > Custom domains
2. Add domain: `app.rotationtv.network`
3. Follow DNS verification steps

### Custom Domain for Worker

Add a route in `wrangler.toml`:

```toml
[env.production.routes]
pattern = "api.rotationtv.network/*"
custom_domain = true
```

Then deploy:
```bash
npx wrangler deploy --env production
```

## 7. GitHub Actions CI/CD

Add these secrets to your GitHub repository:

```
CLOUDFLARE_API_TOKEN      # Create at https://dash.cloudflare.com/profile/api-tokens
CLOUDFLARE_ACCOUNT_ID     # From Cloudflare dashboard right sidebar
```

The workflow in `.github/workflows/deploy.yml` will:
- Run on push to `main`
- Build and deploy the worker
- Build and deploy the frontend to Pages

## 8. Post-Deployment Verification

### Health Checks
```bash
# Worker health
curl https://api.rotationtv.network/health

# Stream health (if CF_STREAM_API_TOKEN set)
curl https://api.rotationtv.network/api/streaming/health/test
```

### Telegram Mini App Test
1. Open your bot in Telegram
2. Tap the menu button
3. Verify the app loads and initData auth succeeds

### Web Mode Test
1. Open `https://app.rotationtv.network` in a browser
2. Verify landing page, channel browser, and auth flow

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Add your domain to the CORS origin list in `worker/src/index.ts` |
| initData invalid | Check `TELEGRAM_BOT_TOKEN` matches the bot that opened the Mini App |
| Stream playback fails | Verify `CF_STREAM_API_TOKEN` and `CF_ACCOUNT_ID` secrets |
| Database errors | Re-run migrations: `npx wrangler d1 migrations apply` |
| KV rate limit errors | Check KV namespace bindings in `wrangler.toml` |

## Resource IDs (Reference)

| Resource | ID/Name |
|----------|---------|
| D1 Database | `4c51f100-3de8-4fc2-a355-08ae412077e9` |
| KV_RATE_LIMIT | `96e51e2e7a1040e58d794c5f70d74d9d` |
| KV_CACHE | `5bcff7ee359a4422b35d800e4ebae80e` |
| Pages Project | `rotationtv-web-app` |
| Worker | `rtv-api` |

## Live Resources

- **Frontend**: https://mcky5iohe4d4u.kimi.page
- **API Worker**: `https://rtv-api.rotationtimmy.workers.dev`
- **Telegram Bot**: @RotationTimmy
