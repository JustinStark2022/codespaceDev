-- Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent','child','admin','staff','user')),
  parent_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  age INT,
  profile_picture TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index to speed lookups by parent
CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);

-- LLM generated content history (from logs)
CREATE TABLE IF NOT EXISTS llm_generated_content (
  id BIGSERIAL PRIMARY KEY,
  content_type TEXT NOT NULL,                                  -- e.g. 'chat','devotional','verse'
  prompt TEXT,
  system_prompt TEXT,
  generated_content TEXT,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  child_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  context TEXT,
  tokens_used INT,
  generation_time_ms BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_generated_content_user ON llm_generated_content(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_generated_content_child ON llm_generated_content(child_id);
CREATE INDEX IF NOT EXISTS idx_llm_generated_content_created_at ON llm_generated_content(created_at);

-- Daily verse of the day (one row per UTC date)
CREATE TABLE IF NOT EXISTS daily_verses (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  reference TEXT NOT NULL,
  verse_text TEXT NOT NULL,
  reflection TEXT,
  prayer TEXT,
  raw_response TEXT,
  tokens_used INT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_verses_date ON daily_verses(date);

-- Optional: view most recent verse
CREATE OR REPLACE VIEW latest_daily_verse AS
SELECT *
FROM daily_verses
ORDER BY date DESC
LIMIT 1;

-- Sanity checks
-- SELECT * FROM users LIMIT 5;
-- SELECT * FROM daily_verses ORDER BY date DESC LIMIT 5;
