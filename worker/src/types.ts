export interface Env {
  DB: D1Database
  KV_RATE_LIMIT: KVNamespace
  KV_CACHE: KVNamespace
  TELEGRAM_BOT_TOKEN: string
  RTV_API_SECRET: string
  ADMIN_SECRET: string
}

export interface RTVUser {
  id: number
  telegram_id: string
  username?: string
  display_name: string
  avatar_url?: string
  bio?: string
  is_creator: boolean
  is_admin: boolean
  verified: boolean
  verified_age: boolean
  balance_stars: number
  balance_rtv: number
  total_earned_usd: number
  payout_method?: string
  payout_destination?: string
  created_at: string
  updated_at: string
}

export interface Channel {
  id: number
  slug: string
  name: string
  description?: string
  logo_url?: string
  banner_url?: string
  category: string
  is_live: boolean
  is_fast: boolean
  stream_url?: string
  hls_url?: string
  dash_url?: string
  whip_endpoint?: string
  whep_endpoint?: string
  current_program?: string
  viewer_count: number
  peak_viewers: number
  total_hours_watched: number
  created_by?: number
  created_at: string
  updated_at: string
}

export interface Stream {
  id: number
  channel_id?: number
  user_id: number
  title: string
  description?: string
  thumbnail_url?: string
  hls_url?: string
  whip_url?: string
  status: 'pending' | 'live' | 'ended' | 'blocked'
  viewer_count: number
  peak_viewers: number
  total_tips_stars: number
  total_tips_usd: number
  started_at?: string
  ended_at?: string
  created_at: string
}

export interface VODItem {
  id: number
  stream_id?: number
  channel_id?: number
  user_id: number
  title: string
  description?: string
  thumbnail_url?: string
  video_url: string
  duration_seconds: number
  category: string
  tags?: string
  view_count: number
  is_public: boolean
  is_premium: boolean
  created_at: string
}

export interface Tip {
  id: number
  stream_id?: number
  sender_id: number
  receiver_id: number
  gift_type: string
  gift_emoji: string
  amount_stars: number
  amount_usd: number
  message?: string
  is_anonymous: boolean
  created_at: string
}

export interface Payout {
  id: number
  user_id: number
  amount_usd: number
  amount_rtv: number
  method: 'USDT' | 'RUB' | 'EUR'
  destination: string
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  notes?: string
  requested_at: string
  processed_at?: string
}
