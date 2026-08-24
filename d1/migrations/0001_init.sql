CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL UNIQUE,
  username TEXT,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  is_creator INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  verified INTEGER DEFAULT 0,
  verified_age INTEGER DEFAULT 0,
  balance_stars INTEGER DEFAULT 0,
  balance_rtv INTEGER DEFAULT 0,
  total_earned_usd REAL DEFAULT 0,
  payout_method TEXT,
  payout_destination TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  category TEXT,
  is_live INTEGER DEFAULT 0,
  is_fast INTEGER DEFAULT 0,
  stream_url TEXT,
  hls_url TEXT,
  dash_url TEXT,
  whip_endpoint TEXT,
  whep_endpoint TEXT,
  current_program TEXT,
  viewer_count INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  total_hours_watched REAL DEFAULT 0,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  start_time DATETIME,
  end_time DATETIME,
  FOREIGN KEY (channel_id) REFERENCES channels(id)
);

CREATE TABLE IF NOT EXISTS streams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER,
  user_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  hls_url TEXT,
  whip_url TEXT,
  status TEXT DEFAULT 'pending',
  viewer_count INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  total_tips_stars INTEGER DEFAULT 0,
  total_tips_usd REAL DEFAULT 0,
  started_at DATETIME,
  ended_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES channels(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS vod (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stream_id INTEGER,
  channel_id INTEGER,
  user_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  category TEXT,
  tags TEXT,
  view_count INTEGER DEFAULT 0,
  is_public INTEGER DEFAULT 1,
  is_premium INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stream_id) REFERENCES streams(id),
  FOREIGN KEY (channel_id) REFERENCES channels(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stream_id INTEGER,
  sender_id INTEGER,
  receiver_id INTEGER,
  gift_type TEXT,
  gift_emoji TEXT,
  amount_stars INTEGER DEFAULT 0,
  amount_usd REAL DEFAULT 0,
  message TEXT,
  is_anonymous INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stream_id) REFERENCES streams(id),
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  amount_usd REAL,
  amount_rtv INTEGER,
  method TEXT,
  destination TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ad_markers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER,
  stream_id INTEGER,
  marker_type TEXT,
  timestamp_seconds INTEGER,
  duration_seconds INTEGER,
  metadata TEXT,
  processed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES channels(id),
  FOREIGN KEY (stream_id) REFERENCES streams(id)
);

-- Sample FAST channels (public demo streams)
INSERT INTO channels (slug, name, description, category, is_live, is_fast, hls_url, viewer_count) VALUES
('rtv-news', 'RTV News 24/7', 'Breaking news and world events', 'news', 1, 1, 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', 1240),
('rtv-movies', 'RTV Movies', 'Classic and indie films', 'movies', 1, 1, 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', 890),
('rtv-music', 'RTV Music', '24/7 music videos and live performances', 'music', 1, 1, 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', 2100),
('rtv-sports', 'RTV Sports', 'Live sports highlights and replays', 'sports', 1, 1, 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', 3400),
('rtv-gaming', 'RTV Gaming', 'Esports and gameplay', 'gaming', 1, 1, 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', 560),
('rtv-culture', 'RTV Culture', 'Documentaries and culture', 'culture', 1, 1, 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', 430),
('rtv-live', 'RTV Live Events', 'Real-time live broadcasts', 'live', 1, 0, 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', 180),
('rtv-creator', 'RTV Creator Hub', 'Community creator streams', 'creator', 1, 0, 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', 320);

-- Sample VOD content
INSERT INTO vod (user_id, title, description, video_url, duration_seconds, category, tags, view_count) VALUES
(1, 'Tears of Steel', 'A sci-fi short film about robots and memories', 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', 734, 'movies', 'sci-fi,short', 15400),
(1, 'Big Buck Bunny', 'Open movie project by Blender Foundation', 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', 596, 'animation', 'animation,comedy', 89300),
(1, 'Sintel', 'Fantasy animated short film', 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', 888, 'animation', 'fantasy,drama', 42100);

-- ===== TELEGRAM APP ORCHESTRATOR TABLES =====

CREATE TABLE IF NOT EXISTS bot_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT NOT NULL UNIQUE,
  bot_token_hash TEXT NOT NULL,
  bot_name TEXT NOT NULL,
  bot_username TEXT NOT NULL,
  web_app_url TEXT NOT NULL,
  allowed_origins TEXT DEFAULT '["*"]',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version_id TEXT NOT NULL UNIQUE,
  bot_id TEXT NOT NULL,
  version_tag TEXT NOT NULL,
  asset_cdn_url TEXT NOT NULL,
  feature_flags TEXT DEFAULT '{}',
  is_active INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT NOT NULL,
  flag_key TEXT NOT NULL,
  flag_value TEXT NOT NULL,
  flag_type TEXT DEFAULT 'boolean',
  rollout_percent INTEGER DEFAULT 100,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT NOT NULL,
  update_type TEXT,
  payload TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_versions_bot_id ON app_versions(bot_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_bot_id ON feature_flags(bot_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_bot_id ON webhook_logs(bot_id);

-- ===== CLOUDFLARE STREAM TABLES =====

CREATE TABLE IF NOT EXISTS cloudflare_live_inputs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  channel_id INTEGER,
  rtmps_url TEXT,
  srt_url TEXT,
  webrtc_url TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES channels(id)
);

CREATE TABLE IF NOT EXISTS cloudflare_vod (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL UNIQUE,
  cf_stream_uid TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  channel_id INTEGER,
  user_id INTEGER,
  thumbnail_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  requires_token INTEGER DEFAULT 0,
  token_cost_rtv INTEGER DEFAULT 0,
  is_public INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES channels(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_cloudflare_live_inputs_channel ON cloudflare_live_inputs(channel_id);
CREATE INDEX IF NOT EXISTS idx_cloudflare_vod_channel ON cloudflare_vod(channel_id);
CREATE INDEX IF NOT EXISTS idx_cloudflare_vod_user ON cloudflare_vod(user_id);
