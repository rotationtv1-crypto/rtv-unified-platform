-- Active streaming pipeline tracking
CREATE TABLE IF NOT EXISTS active_streams (
  stream_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'ingesting', 'transcoding', 'live', 'error')),
  config TEXT,
  viewers INTEGER DEFAULT 0,
  bitrate INTEGER DEFAULT 0,
  fps INTEGER DEFAULT 0,
  started_at TEXT,
  stopped_at TEXT
);

CREATE INDEX idx_active_streams_status ON active_streams(status);
