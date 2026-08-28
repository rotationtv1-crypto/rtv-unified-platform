-- NVIDIA Cosmos SRS processing metrics
CREATE TABLE IF NOT EXISTS srs_processing_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stream_id TEXT NOT NULL,
  input_res TEXT NOT NULL,
  output_res TEXT NOT NULL,
  model TEXT NOT NULL,
  processing_ms INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_srs_stream ON srs_processing_log(stream_id);
