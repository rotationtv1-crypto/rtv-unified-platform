# RotationTV Network

Cable-grade streaming television network with token-native monetization, built on Cloudflare edge infrastructure.

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + Vite, deployed as Telegram Mini App
- **Backend**: Hono framework on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite edge database)
- **Cache/Rate Limit**: Cloudflare KV
- **Streaming**: HLS.js for playback, CMAF packaging ready

## Project Structure

```
rtv-unified-platform/
├── frontend/          # Telegram Mini App (React + Vite)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── store/rtvStore.ts
│   │   ├── hooks/useTelegramAuth.ts
│   │   └── sections/
│   │       ├── ChannelGrid.tsx
│   │       ├── LivePlayer.tsx
│   │       ├── VODLibrary.tsx
│   │       ├── CreatorDashboard.tsx
│   │       ├── AdminPanel.tsx
│   │       └── BottomNav.tsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── postcss.config.js
├── worker/            # Cloudflare Worker API (Hono)
│   ├── src/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── lib/
│   │   │   ├── db.ts
│   │   │   ├── rateLimit.ts
│   │   │   ├── telegramAuth.ts
│   │   │   └── errorHandler.ts
│   │   └── routes/
│   │       ├── auth.ts
│   │       ├── channels.ts
│   │       ├── streams.ts
│   │       ├── vod.ts
│   │       ├── tips.ts
│   │       ├── payouts.ts
│   │       ├── admin.ts
│   │       └── health.ts
│   ├── package.json
│   ├── wrangler.toml
│   └── tsconfig.json
└── d1/
    └── migrations/
        └── 0001_init.sql
```

## Features

- **FAST Channels**: 24/7 scheduled programming with demo HLS streams
- **Live Streaming**: Real-time broadcast with WebRTC ingest (WHIP/WHEP)
- **VOD Library**: Searchable on-demand content
- **Creator Studio**: Dashboard with earnings, analytics, payout requests
- **Tipping/Gifts**: 6-tier gift system (🌹⭐🚀👑💎📡) using Telegram Stars
- **Payouts**: USDT, EUR, RUB with minimum thresholds
- **Admin Panel**: User management, payout approval, platform analytics
- **Rate Limiting**: KV-based with graceful degradation
- **Telegram Auth**: HMAC-SHA256 validation of initData

## Environment Variables

### Worker (Cloudflare Secrets)
- `TELEGRAM_BOT_TOKEN` — Your Telegram bot token
- `RTV_API_SECRET` — API signing secret
- `ADMIN_SECRET` — Admin panel access key

### Frontend
- `VITE_API_BASE` — Worker API URL

## Deployment

See [DEPLOY.md](DEPLOY.md) for detailed deployment instructions.

## Quick Start

```bash
# Clone
git clone https://github.com/rotationtv1-crypto/rtv-unified-platform.git
cd rtv-unified-platform

# Frontend
cd frontend
npm install
npm run dev

# Worker (separate terminal)
cd ../worker
npm install
npx wrangler dev
```

## Live Deployment

- **Frontend**: https://mcky5iohe4u.kimi.page
- **API**: `https://rtv-api.rotationtimmy.workers.dev` (deploy locally with your token)

## License

MIT — RotationTV Network LLC
