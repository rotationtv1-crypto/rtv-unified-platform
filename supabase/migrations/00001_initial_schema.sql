-- ================================================================
-- RotationTV Unified Platform — Initial Schema
-- Cable-grade streaming television network
-- ================================================================

-- Custom types
CREATE TYPE content_rating AS ENUM ('G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-Y', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA', 'Unrated');
CREATE TYPE channel_type AS ENUM ('fast', 'live', 'premium', 'creator');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_provider AS ENUM ('telegram_stars', 'stripe', 'ton', 'tribute');

-- ================================================================
-- PROFILES (extends auth.users)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  onboarding_completed BOOLEAN DEFAULT false,
  is_creator BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Users can read all profiles, update only their own
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ================================================================
-- USER PREFERENCES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_language TEXT DEFAULT 'en',
  subtitle_language TEXT,
  autoplay BOOLEAN DEFAULT true,
  parental_controls_enabled BOOLEAN DEFAULT false,
  max_content_rating content_rating DEFAULT 'R',
  theme TEXT DEFAULT 'dark',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own preferences"
  ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- ================================================================
-- AUTH SESSIONS (for custom session tracking)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  refresh_token_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions"
  ON public.auth_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions"
  ON public.auth_sessions FOR DELETE USING (auth.uid() = user_id);

-- ================================================================
-- CATEGORIES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- GENRES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  category_id UUID REFERENCES public.categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- SHOWS (TV Shows / Movies / Originals)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'vod', -- vod, series, movie, live_event
  category_id UUID REFERENCES public.categories(id),
  genres UUID[] DEFAULT '{}',
  poster_url TEXT,
  backdrop_url TEXT,
  trailer_url TEXT,
  year INTEGER,
  rating content_rating DEFAULT 'PG-13',
  duration_minutes INTEGER,
  is_original BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  release_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shows are viewable by everyone"
  ON public.shows FOR SELECT USING (is_active = true);

-- ================================================================
-- SHOW GENRES (junction)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.show_genres (
  show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
  genre_id UUID REFERENCES public.genres(id) ON DELETE CASCADE,
  PRIMARY KEY (show_id, genre_id)
);

-- ================================================================
-- CHANNELS (FAST / Live / Premium / Creator)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type channel_type NOT NULL DEFAULT 'fast',
  category_id UUID REFERENCES public.categories(id),
  logo_url TEXT,
  poster_url TEXT,
  hls_url TEXT,
  dash_url TEXT,
  srt_ingest_url TEXT,
  rtmp_ingest_url TEXT,
  is_live BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  viewer_count INTEGER DEFAULT 0,
  total_view_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Channels are viewable by everyone"
  ON public.channels FOR SELECT USING (is_active = true);

-- ================================================================
-- PROGRAMS (EPG schedule)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  show_id UUID REFERENCES public.shows(id),
  title TEXT NOT NULL,
  description TEXT,
  episode_title TEXT,
  season_number INTEGER,
  episode_number INTEGER,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  rating content_rating DEFAULT 'PG-13',
  is_live_broadcast BOOLEAN DEFAULT false,
  is_rerun BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Programs are viewable by everyone"
  ON public.programs FOR SELECT USING (true);

-- ================================================================
-- VOD ITEMS (episodes / movies)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.vod_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  season_number INTEGER,
  episode_number INTEGER,
  video_url TEXT,
  hls_url TEXT,
  dash_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  is_free BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vod_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "VOD items are viewable by everyone"
  ON public.vod_items FOR SELECT USING (is_active = true);

-- ================================================================
-- WATCH HISTORY
-- ================================================================
CREATE TABLE IF NOT EXISTS public.watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  show_id UUID REFERENCES public.shows(id),
  channel_id UUID REFERENCES public.channels(id),
  vod_item_id UUID REFERENCES public.vod_items(id),
  progress_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  watched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, show_id, vod_item_id)
);

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own watch history"
  ON public.watch_history FOR ALL USING (auth.uid() = user_id);

-- ================================================================
-- BOOKMARKS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  show_id UUID REFERENCES public.shows(id),
  channel_id UUID REFERENCES public.channels(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, show_id, channel_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own bookmarks"
  ON public.bookmarks FOR ALL USING (auth.uid() = user_id);

-- ================================================================
-- TELEGRAM USERS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.telegram_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE,
  profile_id UUID REFERENCES public.profiles(id),
  telegram_username TEXT,
  telegram_first_name TEXT,
  telegram_last_name TEXT,
  telegram_photo_url TEXT,
  init_data_raw TEXT,
  init_data_validated BOOLEAN DEFAULT false,
  last_interaction_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Telegram users are viewable by admins"
  ON public.telegram_users FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ================================================================
-- TRANSACTIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  provider payment_provider NOT NULL,
  provider_transaction_id TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'XTR',
  status payment_status DEFAULT 'pending',
  item_type TEXT, -- subscription, tip, donation, purchase
  item_id UUID,
  metadata JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT USING (auth.uid() = user_id);

-- ================================================================
-- CREATORS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  channel_name TEXT NOT NULL,
  channel_description TEXT,
  channel_logo_url TEXT,
  channel_banner_url TEXT,
  verification_status TEXT DEFAULT 'pending', -- pending, verified, rejected
  stripe_connect_id TEXT,
  total_tips_received NUMERIC(12,2) DEFAULT 0,
  total_subscribers INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id)
);

ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators are viewable by everyone"
  ON public.creators FOR SELECT USING (is_active = true);
CREATE POLICY "Creators can update own profile"
  ON public.creators FOR UPDATE USING (auth.uid() = profile_id);

-- ================================================================
-- TRIBUTES (Tips/Donations)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.tributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'XTR',
  message TEXT,
  transaction_id UUID REFERENCES public.transactions(id),
  status payment_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view sent/received tributes"
  ON public.tributes FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- ================================================================
-- WEBHOOK EVENTS (audit log)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  event_type TEXT,
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- TRIGGERS: Auto-update timestamps
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shows_updated_at BEFORE UPDATE ON public.shows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vod_items_updated_at BEFORE UPDATE ON public.vod_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_creators_updated_at BEFORE UPDATE ON public.creators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- SEED DATA
-- ================================================================

-- Categories
INSERT INTO public.categories (slug, name, description, color, icon, sort_order) VALUES
  ('news', 'News', 'Breaking news and current events', '#ef4444', 'newspaper', 1),
  ('sports', 'Sports', 'Live sports and athletics', '#22c55e', 'trophy', 2),
  ('movies', 'Movies', 'Feature films and cinema', '#a855f7', 'film', 3),
  ('tv-series', 'TV Series', 'Serialized television content', '#3b82f6', 'tv', 4),
  ('documentaries', 'Documentaries', 'Non-fiction and educational', '#f59e0b', 'book-open', 5),
  ('music', 'Music', 'Music videos and concerts', '#ec4899', 'music', 6),
  ('kids', 'Kids', 'Children and family content', '#06b6d4', 'baby', 7),
  ('lifestyle', 'Lifestyle', 'Fashion, food, and culture', '#f97316', 'heart', 8),
  ('technology', 'Technology', 'Tech news and reviews', '#6366f1', 'cpu', 9),
  ('gaming', 'Gaming', 'Video games and esports', '#8b5cf6', 'gamepad', 10),
  ('comedy', 'Comedy', 'Stand-up and comedy shows', '#eab308', 'smile', 11),
  ('reality', 'Reality TV', 'Reality and unscripted', '#14b8a6', 'video', 12),
  ('science', 'Science', 'Science and nature', '#10b981', 'flask', 13),
  ('faith', 'Faith', 'Religious and spiritual', '#84cc16', 'church', 14)
ON CONFLICT (slug) DO NOTHING;

-- Genres
INSERT INTO public.genres (slug, name, description, color) VALUES
  ('action', 'Action', 'High-energy physical stunts and chases', '#ef4444'),
  ('adventure', 'Adventure', 'Exciting journeys and quests', '#f97316'),
  ('animation', 'Animation', 'Animated content for all ages', '#ec4899'),
  ('anime', 'Anime', 'Japanese animation', '#a855f7'),
  ('biography', 'Biography', 'Life stories of real people', '#3b82f6'),
  ('comedy', 'Comedy', 'Humorous and funny content', '#eab308'),
  ('crime', 'Crime', 'Criminal activities and investigations', '#ef4444'),
  ('documentary', 'Documentary', 'Factual non-fiction content', '#f59e0b'),
  ('drama', 'Drama', 'Serious emotional narratives', '#8b5cf6'),
  ('family', 'Family', 'Content suitable for all ages', '#22c55e'),
  ('fantasy', 'Fantasy', 'Magical and supernatural worlds', '#a855f7'),
  ('history', 'History', 'Historical events and periods', '#b45309'),
  ('horror', 'Horror', 'Frightening and suspenseful', '#dc2626'),
  ('mystery', 'Mystery', 'Puzzles and unsolved cases', '#6366f1'),
  ('romance', 'Romance', 'Love stories and relationships', '#ec4899'),
  ('sci-fi', 'Sci-Fi', 'Science fiction and futuristic', '#3b82f6'),
  ('thriller', 'Thriller', 'Suspense and tension', '#ef4444'),
  ('war', 'War', 'Military and conflict', '#7f1d1d'),
  ('western', 'Western', 'American frontier stories', '#b45309'),
  ('music', 'Music', 'Musical performances and content', '#ec4899'),
  ('musical', 'Musical', 'Narrative with songs', '#ec4899'),
  ('sport', 'Sport', 'Athletic competitions', '#22c55e'),
  ('superhero', 'Superhero', 'Heroes with extraordinary powers', '#3b82f6'),
  ('talk-show', 'Talk Show', 'Interview and discussion format', '#f59e0b'),
  ('reality', 'Reality', 'Unscripted real-life situations', '#14b8a6'),
  ('game-show', 'Game Show', 'Competition with prizes', '#eab308'),
  ('news', 'News', 'Current events reporting', '#ef4444'),
  ('politics', 'Politics', 'Political news and commentary', '#dc2626'),
  ('business', 'Business', 'Commerce and finance', '#22c55e'),
  ('travel', 'Travel', 'Exploration and destinations', '#06b6d4'),
  ('food', 'Food', 'Cooking and cuisine', '#f97316'),
  ('fashion', 'Fashion', 'Style and design', '#ec4899'),
  ('health', 'Health', 'Wellness and fitness', '#22c55e'),
  ('science', 'Science', 'Scientific discovery and research', '#10b981'),
  ('nature', 'Nature', 'Wildlife and environment', '#22c55e'),
  ('technology', 'Technology', 'Innovation and gadgets', '#6366f1'),
  ('education', 'Education', 'Learning and tutorials', '#3b82f6'),
  ('diy', 'DIY', 'Do-it-yourself projects', '#f97316'),
  ('gardening', 'Gardening', 'Plants and landscaping', '#22c55e'),
  ('pets', 'Pets', 'Animals and pet care', '#f97316'),
  ('autos', 'Autos', 'Cars and vehicles', '#dc2626'),
  ('true-crime', 'True Crime', 'Real criminal cases', '#7f1d1d'),
  ('paranormal', 'Paranormal', 'Supernatural phenomena', '#a855f7'),
  ('conspiracy', 'Conspiracy', 'Alternative theories', '#6366f1'),
  ('stand-up', 'Stand-Up', 'Live comedy performances', '#eab308'),
  ('sketch', 'Sketch Comedy', 'Short comedic scenes', '#f59e0b'),
  ('improv', 'Improv', 'Improvisational comedy', '#ec4899'),
  ('satire', 'Satire', 'Social commentary through humor', '#eab308'),
  ('rom-com', 'Rom-Com', 'Romantic comedy', '#ec4899'),
  ('dark-comedy', 'Dark Comedy', 'Black humor', '#7f1d1d'),
  ('slapstick', 'Slapstick', 'Physical comedy', '#f59e0b')
ON CONFLICT (slug) DO NOTHING;
