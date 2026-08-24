# Local Development Setup

Complete guide for running the RotationTV unified platform locally.

## Prerequisites

- Node.js 20+ (`node -v`)
- npm 10+ (`npm -v`)
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- Telegram Bot token (from [@BotFather](https://t.me/BotFather))

## 1. Clone & Install

```bash
git clone https://github.com/rotationtv1-crypto/rtv-unified-platform.git
cd rtv-unified-platform

# Install frontend dependencies
cd frontend
npm install

# Install worker dependencies (separate terminal)
cd ../worker
npm install
```

## 2. Worker Local Development

### 2.1 Configure Wrangler

```bash
cd worker
npx wrangler login
```

### 2.2 Create Local D1 Database

```bash
npx wrangler d1 create rtv-local-db
```

Update `wrangler.toml` with the database ID:

```toml
[[env.development.d1_databases]]
binding = "DB"
database_name = "rtv-local-db"
database_id = "your-local-db-id"
```

### 2.3 Create Local KV Namespaces

```bash
npx wrangler kv:namespace create "KV_RATE_LIMIT" --local
npx wrangler kv:namespace create "KV_CACHE" --local
npx wrangler kv:namespace create "KV_TOKENS" --local
```

### 2.4 Apply Migrations

```bash
npx wrangler d1 migrations apply rtv-local-db --local
```

### 2.5 Set Local Secrets

Create a `.dev.vars` file in the `worker/` directory:

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
JWT_SECRET=your_jwt_secret_here_min_32_chars
ENCRYPTION_KEY=your_encryption_key_here_min_32_chars
ADMIN_SECRET=your_admin_secret_here
RTV_API_SECRET=your_api_secret_here
CF_STREAM_API_TOKEN=optional_stream_token
CF_ACCOUNT_ID=optional_account_id
```

### 2.6 Start Local Dev Server

```bash
npx wrangler dev --env development
```

The worker will be available at `http://localhost:8787`.

## 3. Frontend Local Development

### 3.1 Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```
VITE_API_BASE=http://localhost:8787
```

For Telegram Mini App testing with a production worker:

```
VITE_API_BASE=https://rtv-api.rotationtimmy.workers.dev
```

### 3.2 Start Dev Server

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### 3.3 Test Telegram Mini App Locally

Telegram Mini Apps require HTTPS. Use one of these methods:

**Option A: ngrok**
```bash
npx ngrok http 5173
```
Then update your bot's Web App URL in @BotFather to the ngrok HTTPS URL.

**Option B: Cloudflare Tunnel**
```bash
npx cloudflared tunnel --url http://localhost:5173
```

**Option C: LocalTunnel**
```bash
npx localtunnel --port 5173
```

## 4. Testing the Multi-Bot Gateway

### 4.1 Register a Bot

```bash
curl -X POST http://localhost:8787/telegram/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_admin_secret" \
  -d '{
    "bot_id": "my_test_bot",
    "bot_token": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
    "name": "Test Bot"
  }'
```

### 4.2 Proxy a Bot API Call

```bash
curl -X POST http://localhost:8787/telegram/my_test_bot/getMe \
  -H "Content-Type: application/json"
```

### 4.3 List All Bots

```bash
curl http://localhost:8787/telegram/bots \
  -H "Authorization: Bearer your_admin_secret"
```

## 5. Testing Cloudflare Stream

### 5.1 Create a Live Input

```bash
curl -X POST http://localhost:8787/api/streaming/live-inputs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "name": "Test Stream",
    "channel_id": "test-channel"
  }'
```

### 5.2 List Live Inputs

```bash
curl http://localhost:8787/api/streaming/live-inputs \
  -H "Authorization: Bearer your_jwt_token"
```

### 5.3 Get Playback URL

```bash
curl http://localhost:8787/api/streaming/playback/:uid \
  -H "Authorization: Bearer your_jwt_token"
```

## 6. Database Management

### 6.1 Execute SQL

```bash
npx wrangler d1 execute rtv-local-db --local --command "SELECT * FROM users LIMIT 5"
```

### 6.2 Export Schema

```bash
npx wrangler d1 export rtv-local-db --local --output=./schema.sql
```

### 6.3 Reset Database

```bash
npx wrangler d1 migrations apply rtv-local-db --local --skip-drizzle
```

## 7. Code Structure Cheat Sheet

| File | Purpose |
|------|---------|
| `frontend/src/App.tsx` | Mode detection (Telegram vs Web) |
| `frontend/src/sections/MiniAppLayout.tsx` | Telegram tab-based UI |
| `frontend/src/sections/WebLayout.tsx` | Web top-nav + routing UI |
| `frontend/src/sections/LandingPage.tsx` | Marketing homepage |
| `frontend/src/store/rtvStore.ts` | Global state (Zustand) |
| `worker/src/index.ts` | Hono app, middleware, routes |
| `worker/src/telegram/*.ts` | Telegram subsystem |
| `worker/src/streaming/*.ts` | Cloudflare Stream integration |
| `d1/migrations/0001_init.sql` | Database schema |

## 8. Common Issues

### Vite HMR not working in Telegram WebView

Add to `vite.config.ts`:

```typescript
server: {
  hmr: {
    protocol: 'wss',
    host: 'your-ngrok-host.ngrok.io',
  },
}
```

### D1 "database not found" in local dev

Ensure you're using `--local` flag:

```bash
npx wrangler d1 execute rtv-local-db --local --command "SELECT 1"
```

### CORS errors in local dev

The worker CORS config already includes `http://localhost:5173`. If you changed ports, update:

```typescript
// worker/src/index.ts
origin: [
  'http://localhost:5173',
  'http://localhost:3000',
  // ...
]
```

### initData validation fails locally

Telegram's `initData` includes the bot ID. Ensure:
1. You're opening the Mini App from the correct bot
2. `TELEGRAM_BOT_TOKEN` matches that bot
3. The Web App URL in @BotFather points to your local tunnel

## 9. Development Workflow

```bash
# Terminal 1: Worker
 cd worker && npx wrangler dev --env development

# Terminal 2: Frontend
 cd frontend && npm run dev

# Terminal 3: ngrok (for Telegram testing)
 npx ngrok http 5173
```

## 10. Production Checklist

Before deploying to production:

- [ ] All secrets set in Cloudflare (`npx wrangler secret list --env production`)
- [ ] D1 migrations applied to production DB
- [ ] KV namespaces created and bound
- [ ] CORS origins include production domain
- [ ] Telegram bot Web App URL points to production
- [ ] Webhook URL points to production worker
- [ ] Admin bot registered in the system
- [ ] `CF_STREAM_API_TOKEN` set (for streaming features)

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare Stream Docs](https://developers.cloudflare.com/stream/)
- [Telegram Mini App Docs](https://core.telegram.org/bots/webapps)
- [Hono Framework](https://hono.dev/)
