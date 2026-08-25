export interface Env {
  DB: D1Database
  D1: D1Database
  KV_RATE_LIMIT: KVNamespace
  KV_CACHE: KVNamespace
  KV_TOKENS?: KVNamespace
  TELEGRAM_BOT_TOKEN: string
  ADMIN_SECRET: string
  JWT_SECRET: string
  TELEGRAM_INITDATA_MAX_AGE?: string
  CF_STREAM_API_TOKEN?: string
  CF_ACCOUNT_ID?: string
  ENVIRONMENT: string
}

export interface RTVUser {
  id: string
  telegram_id: string
  username?: string
  display_name: string
  avatar_url?: string
  is_creator: boolean
  is_admin: boolean
  verified: boolean
  balance_stars: number
  balance_rtv: number
  created_at: string
}

export interface Channel {
  id: string
  slug: string
  name: string
  description?: string
  logo_url?: string
  category: string
  is_live: boolean
  is_fast: boolean
  stream_url?: string
  hls_url?: string
  dash_url?: string
  current_program?: string
  viewer_count: number
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Stream {
  id: string
  channel_id?: string
  user_id: string
  title: string
  description?: string
  thumbnail_url?: string
  hls_url?: string
  whip_url?: string
  status: 'pending' | 'live' | 'ended' | 'banned'
  viewer_count: number
  peak_viewers: number
  total_tips_stars: number
  total_tips_usd: number
  started_at?: string
  ended_at?: string
  created_at: string
}

export interface VODItem {
  id: string
  stream_id?: string
  channel_id?: string
  user_id: string
  title: string
  description?: string
  thumbnail_url?: string
  video_url: string
  duration_seconds: number
  category: string
  tags: string
  view_count: number
  is_public: boolean
  created_at: string
}

export interface Tip {
  id: string
  stream_id?: string
  sender_id: string
  receiver_id: string
  gift_type: string
  gift_emoji: string
  amount_stars: number
  amount_usd: number
  message?: string
  is_anonymous: boolean
  created_at: string
}

export interface Payout {
  id: string
  user_id: string
  amount_usd: number
  amount_rtv: number
  method: 'usdt' | 'rub' | 'eur'
  destination: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  requested_at: string
  processed_at?: string
}

export interface CloudflareLiveInput {
  uid: string
  name: string
  channel_id?: string
  rtmps_url: string
  srt_url: string
  webrtc_url: string
  status: string
  created_at: string
}

export interface CloudflareVOD {
  uid: string
  cf_stream_uid: string
  title: string
  description?: string
  channel_id?: string
  user_id: string
  thumbnail_url?: string
  duration_seconds: number
  view_count: number
  requires_token: boolean
  token_cost_rtv: number
  is_public: boolean
  created_at: string
}

// Hono context variables for Telegram auth
export interface HonoVariables {
  telegramUser: {
    id: number
    first_name: string
    last_name?: string
    username?: string
    photo_url?: string
    language_code?: string
  }
  botId: string
  botToken: string
  userId: string
}

declare module 'hono' {
  interface ContextVariableMap extends HonoVariables {}
}
