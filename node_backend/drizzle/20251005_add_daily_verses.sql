CREATE TABLE IF NOT EXISTS daily_verses (
  id SERIAL PRIMARY KEY,
  "date" DATE NOT NULL UNIQUE,
  reference TEXT NOT NULL,
  verse_text TEXT NOT NULL,
  reflection TEXT,
  prayer TEXT,
  raw_response TEXT,
  tokens_used INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by_user_id BIGINT REFERENCES users(id)
);
