# RotationTV Network — Unified Platform v2

Sovereign streaming television network with token-native monetization, built on Cloudflare edge infrastructure. Supports both Telegram Mini App and standalone web modes from a single React codebase.

## What's New in v2

- **Unified Frontend**: Single React app auto-detects Telegram vs standalone web
- **Cloudflare Stream Integration**: Live inputs (RTMP/SRT/WebRTC) + VOD with token-gated playback
- **Multi-Bot Gateway**: Support for multiple Telegram bots via bot registry
- **Cloud SDK Proxy**: Secure Bot API proxy with per-bot token routing
- **Sync Engine**: Version publishing and feature flags for Mini App updates
- **Web Auth**: Email/password authentication for standalone web users
- **Landing Page**: Marketing site with feature showcase, stats, and CTAs

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Routing | React Router DOM (web) / Tab-based (Mini App) |
| State | Zustand |
| Player | HLS.js (live + VOD) |
| Backend | Hono framework on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite edge database) |
| Cache/Rate Limit | Cloudflare KV |
| Streaming | Cloudflare Stream API + AWS MediaLive (dual-region) |
| Auth | Telegram initData HMAC-SHA256 + Web JWT |

## Project Structure

```
rtv-unified-platform/
├── frontend/                 # Unified React app (Mini App + Web)
│   ├── src/
│   │   ├── App.tsx           # Mode detection & routing
│   │   ├── main.tsx          # Entry point with Telegram init
│   │   ├── store/rtvStore.ts # Zustand state management
│   │   ├── hooks/
│   │   │   ├── useTelegramAuth.ts   # initData validation
│   │   │   └── useCloudflareStream.ts # Stream API client
│   │   ├── sections/
│   │   │   ├── MiniAppLayout.tsx    # Telegram bottom-nav UI
│   │   │   ├── WebLayout.tsx        # Top-nav web UI
│   │   │   ├── LandingPage.tsx      # Marketing homepage
│   │   │   ├── WebAuth.tsx          # Email/password auth
│   │   │   ├── WebChannelBrowser.tsx # Channel grid (web)
│   │   │   ├── WebLiveStreams.tsx   # Live broadcasts (web)
│   │   │   ├── WebVOD.tsx           # On-demand library (web)
│   │   │   ├── WebWatch.tsx         # Player page (web)
│   │   │   ├── ChannelGrid.tsx      # Mini App channels
│   │   │   ├── LiveStreams.tsx      # Mini App live
│   │   │   ├── VODLibrary.tsx       # Mini App VOD
│   │   │   ├── LivePlayer.tsx       # HLS player overlay
│   │   │   ├── CreatorDashboard.tsx # Studio dashboard
│   │   │   ├── AdminPanel.tsx       # Admin controls
│   │   │   └── BottomNav.tsx        # Mini App navigation
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── worker/                   # Cloudflare Worker API (Hono)
│   ├── src/
│   │   ├── index.ts          # App entry + CORS + routing
│   │   ├── types.ts          # Env bindings + TypeScript types
│   │   ├── telegram/         # Telegram subsystem
│   │   │   ├── botRegistry.ts    # Multi-bot registration
│   │   │   ├── cloudSdk.ts       # Bot API proxy
│   │   │   ├── syncEngine.ts     # Version + feature flags
│   │   │   └── initData.ts       # HMAC-SHA256 validation
│   │   ├── streaming/        # Cloudflare Stream
│   │   │   └── cloudflareStream.ts # Stream API client
│   │   ├── routes/
│   │   │   ├── telegram.ts       # Multi-bot gateway routes
│   │   │   ├── streaming.ts      # Live inputs + VOD routes
│   │   │   ├── channels.ts       # Channel CRUD
│   │   │   ├── streams.ts        # Stream management
│   │   │   ├── vod.ts            # VOD library
│   │   │   ├── auth.ts           # Telegram + Web auth
│   │   │   ├── tips.ts           # Tipping/gifts
│   │   │   ├── payouts.ts        # Creator payouts
│   │   │   ├── admin.ts          # Admin panel API
│   │   │   └── health.ts         # Health check
│   │   └── lib/
│   │       ├── db.ts
│   │       ├── rateLimit.ts
│   │       ├── errorHandler.ts
│   │       └── telegramAuth.ts
│   ├── wrangler.toml
│   └── package.json
├── d1/
│   └── migrations/
│       └── 0001_init.sql     # Full schema with Stream tables
└── .github/
    └── workflows/
        └── deploy.yml          # CI/CD pipeline
```

## Features

### Streaming
- **FAST Channels**: 24/7 scheduled programming with demo HLS streams
- **Live Streaming**: RTMP/SRT/WebRTC ingest via Cloudflare Stream live inputs
- **VOD Library**: On-demand content with token-gated premium access
- **CMAF Packaging**: Single segment set serves both HLS and DASH
- **Dual-Origin**: Cloudflare Stream + AWS MediaLive failover

### Monetization
- **Tipping/Gifts**: 6-tier gift system (🌹⭐🚀👑💎📡) using Telegram Stars
- **Token-Gated Content**: RTV token economy for premium access
- **Payouts**: USDT, EUR, RUB with minimum thresholds
- **Creator Studio**: Dashboard with earnings, analytics, payout requests

### Telegram Integration
- **Multi-Bot Gateway**: Register and manage multiple bot tokens
- **Cloud SDK Proxy**: Secure Bot API proxy (`/telegram/:botId/:method`)
- **Sync Engine**: Version publishing and feature flags
- **Webhook Handler**: Per-bot webhook routing
- **Broadcast**: Admin broadcast to all bot users

### Platform
- **Admin Panel**: User management, payout approval, platform analytics
- **Rate Limiting**: KV-based with graceful degradation
- **Web Auth**: JWT-based email/password for standalone users
- **Responsive**: Mobile-first design for both Mini App and web

## Environment Variables

### Worker Secrets (Cloudflare)
```bash
# Required
TELEGRAM_BOT_TOKEN      # Primary bot token
JWT_SECRET              # Signing secret for web auth
ENCRYPTION_KEY          # KV token encryption

# Cloudflare Stream (optional but recommended)
CF_STREAM_API_TOKEN     # Stream API token
CF_ACCOUNT_ID           # Cloudflare account ID

# Admin
ADMIN_SECRET            # Admin panel access key
RTV_API_SECRET          # API signing secret
```

### Frontend
```bash
VITE_API_BASE=https://rtv-api.rotationtimmy.workers.dev
```

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

## Deployment

See [DEPLOY.md](DEPLOY.md) for detailed deployment instructions.  
See [SETUP.md](SETUP.md) for local development setup.

## Live Deployments

| Component | URL |
|-----------|-----|
| Frontend (Web) | https://mcky5iohe4d4u.kimi.page |
| API Worker | `https://rtv-api.rotationtimmy.workers.dev` |
| Telegram Bot | @RotationTimmy |

## License

MIT — RotationTV Network LLC
