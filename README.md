# RotationTV Unified Platform

Cable-grade streaming television network. Hybrid FAST + Live + VOD platform with broadcast-level reliability.

## Live Deployment

- **Web App:** https://mcky5iohe4d4u.kimi.page
- **Repo:** https://github.com/rotationtv1-crypto/rtv-unified-platform

## Architecture

```
[Content Sources]
 ├── VOD Catalog (S3 Storage) ──────► Unified Origin ──┐
 ├── Live Feeds (SRT / RTMP Ingest) ─► MediaLive ──────┼─► Multi-CDN ─► Unified Apps
 └── Cloud Playout (FAST Schedule) ──► SSAI Engine ────┘   (Akamai/     (Roku/iOS/
                                                            Cloudflare)   Smart TVs)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| State | Zustand (with localStorage persistence) |
| Routing | React Router v7 |
| Player | HLS.js |
| Backend | Supabase Edge Functions (Deno) |
| Database | PostgreSQL 15 + Row Level Security |
| Auth | Supabase Auth + Telegram initData HMAC |
| Payments | Telegram Stars + TON + Tribute |
| CDN | Cloudflare + Akamai + Fastly |

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Environment Setup

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

## Supabase Edge Functions

### Deploy

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref xynkgaxfwvpcixissxdz

# Deploy all functions
supabase functions deploy

# Apply database migrations
supabase db push
```

### Functions

| Function | Path | Auth | Description |
|----------|------|------|-------------|
| auth-web-register | `/auth/web-register` | Public | User registration |
| auth-web-login | `/auth/web-login` | Public | User login |
| auth-me | `/auth/me` | Required | Get current user |
| auth-logout | `/auth/logout` | Required | Sign out |
| channels | `/channels` | Public | List/get channels |
| vod | `/vod` | Public | List/get VOD content |
| telegram-verify | `/telegram/verify` | Public | Validate Telegram initData |
| webhook-tribute | `/webhooks/tribute` | Public | Payment webhooks |

## Database Schema

### Tables

- `profiles` — User profiles (extends auth.users)
- `user_preferences` — Content & accessibility preferences
- `auth_sessions` — Custom session management
- `categories` — Content categories (14 seeded)
- `genres` — Content genres (50+ seeded)
- `shows` — TV shows and movies
- `show_genres` — Many-to-many show-genre junction
- `channels` — Live/FAST channels
- `programs` — EPG program schedule
- `vod_items` — VOD episodes
- `watch_history` — User viewing history
- `bookmarks` — Saved content
- `telegram_users` — Telegram Mini App users
- `transactions` — Payment transactions
- `creators` — Creator profiles
- `tributes` — Creator tips/donations
- `webhook_events` — Incoming webhook audit log

### Row Level Security

All user-data tables have RLS enabled with policies restricting access to the authenticated owner.

## Responsive Breakpoints

| Name | Width | Columns |
|------|-------|---------|
| Mobile | ≤480px | 1 |
| Tablet | 481-768px | 2 |
| Laptop | 769-1024px | 3 |
| Desktop | 1025-1440px | 4-5 |
| Large | ≥1441px | 5-6 |

## Feature Flags

| Flag | Description |
|------|-------------|
| `VITE_ENABLE_TELEGRAM_PAYMENTS` | Telegram Stars checkout |
| `VITE_ENABLE_TON_PAYMENTS` | TON blockchain payments |
| `VITE_ENABLE_SUBSCRIPTIONS` | Premium tier subscriptions |

## Verification

See `verifier/` directory for acceptance criteria and run logs.

## License

Proprietary — RotationTV Network LLC
