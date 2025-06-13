-- Migration: Comprehensive database schema update for parental controls
-- Created: 2024-01-01

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: Update existing tables
-- ═══════════════════════════════════════════════════════════════════════════

-- Add new columns to games table
ALTER TABLE games
ADD COLUMN IF NOT EXISTS platform VARCHAR(100),
ADD COLUMN IF NOT EXISTS flag_reason TEXT,
ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Update screen_time table to support date-based tracking
ALTER TABLE screen_time
ADD COLUMN IF NOT EXISTS date VARCHAR(10) NOT NULL DEFAULT (CURRENT_DATE::TEXT),
ADD COLUMN IF NOT EXISTS allowed_time_minutes INTEGER NOT NULL DEFAULT 120,
ADD COLUMN IF NOT EXISTS used_time_minutes INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS additional_reward_minutes INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Add unique constraint for user_id + date combination
ALTER TABLE screen_time
ADD CONSTRAINT IF NOT EXISTS unique_user_date UNIQUE (user_id, date);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- General Settings
  content_alerts BOOLEAN NOT NULL DEFAULT true,
  screentime_alerts BOOLEAN NOT NULL DEFAULT true,
  lesson_completions BOOLEAN NOT NULL DEFAULT true,
  device_usage BOOLEAN NOT NULL DEFAULT true,
  bible_plan BOOLEAN NOT NULL DEFAULT true,
  -- Bible Settings
  default_translation VARCHAR(10) NOT NULL DEFAULT 'NIV',
  reading_plan VARCHAR(50) NOT NULL DEFAULT 'chronological',
  daily_reminders BOOLEAN NOT NULL DEFAULT true,
  -- App Preferences
  theme_mode VARCHAR(10) NOT NULL DEFAULT 'light',
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  sound_effects BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create content_filters table
CREATE TABLE IF NOT EXISTS content_filters (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  block_violence BOOLEAN NOT NULL DEFAULT true,
  block_language BOOLEAN NOT NULL DEFAULT true,
  block_occult BOOLEAN NOT NULL DEFAULT true,
  block_bullying BOOLEAN NOT NULL DEFAULT true,
  block_sexual BOOLEAN NOT NULL DEFAULT true,
  block_blasphemy BOOLEAN NOT NULL DEFAULT true,
  filter_sensitivity INTEGER NOT NULL DEFAULT 7,
  ai_detection_mode VARCHAR(20) NOT NULL DEFAULT 'balanced',
  realtime_scanning BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create screen_time_settings table
CREATE TABLE IF NOT EXISTS screen_time_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  weekday_limit INTEGER NOT NULL DEFAULT 120,
  weekend_limit INTEGER NOT NULL DEFAULT 180,
  sleep_time TIME NOT NULL DEFAULT '21:00',
  wake_time TIME NOT NULL DEFAULT '07:00',
  break_interval INTEGER NOT NULL DEFAULT 30,
  break_duration INTEGER NOT NULL DEFAULT 5,
  lock_after_bedtime BOOLEAN NOT NULL DEFAULT true,
  pause_during_bedtime BOOLEAN NOT NULL DEFAULT true,
  location_based_rules BOOLEAN NOT NULL DEFAULT true,
  emergency_override BOOLEAN NOT NULL DEFAULT true,
  allow_rewards BOOLEAN NOT NULL DEFAULT true,
  max_reward_time INTEGER NOT NULL DEFAULT 60,
  reward_per_lesson INTEGER NOT NULL DEFAULT 15,
  weekend_bonus BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create trusted_websites table
CREATE TABLE IF NOT EXISTS trusted_websites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  url VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create monitoring_settings table
CREATE TABLE IF NOT EXISTS monitoring_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  live_activity_feed BOOLEAN NOT NULL DEFAULT true,
  screenshot_monitoring BOOLEAN NOT NULL DEFAULT false,
  keystroke_logging BOOLEAN NOT NULL DEFAULT false,
  monitoring_frequency VARCHAR(10) NOT NULL DEFAULT 'medium',
  instant_alerts BOOLEAN NOT NULL DEFAULT true,
  daily_summary BOOLEAN NOT NULL DEFAULT true,
  weekly_reports BOOLEAN NOT NULL DEFAULT true,
  alert_threshold VARCHAR(10) NOT NULL DEFAULT 'medium',
  data_retention INTEGER NOT NULL DEFAULT 90,
  anonymous_analytics BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_content_filters_user_id ON content_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_content_filters_child_id ON content_filters(child_id);
CREATE INDEX IF NOT EXISTS idx_screen_time_settings_user_id ON screen_time_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_screen_time_settings_child_id ON screen_time_settings(child_id);
CREATE INDEX IF NOT EXISTS idx_trusted_websites_user_id ON trusted_websites(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_websites_child_id ON trusted_websites(child_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_settings_user_id ON monitoring_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_flagged ON games(flagged);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: Create new tables for enhanced functionality
-- ═══════════════════════════════════════════════════════════════════════════

-- Activity logs for detailed monitoring
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'app_usage', 'website_visit', 'content_flagged', etc.
  app_name VARCHAR(255),
  website_url VARCHAR(500),
  duration_minutes INTEGER,
  flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  date VARCHAR(10) NOT NULL DEFAULT (CURRENT_DATE::TEXT)
);

-- Alerts system for parent notifications
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- 'content_flagged', 'time_limit', 'new_app', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(10) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
  read BOOLEAN NOT NULL DEFAULT false,
  action_taken VARCHAR(50), -- 'approved', 'blocked', 'ignored'
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Enhanced child profiles
CREATE TABLE IF NOT EXISTS child_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER,
  grade_level VARCHAR(20),
  profile_picture VARCHAR(255),
  favorite_bible_verse TEXT,
  interests TEXT, -- JSON array of interests
  restrictions TEXT, -- JSON object of specific restrictions
  emergency_contacts TEXT, -- JSON array of contacts
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Device session tracking
CREATE TABLE IF NOT EXISTS device_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name VARCHAR(255),
  device_type VARCHAR(50), -- 'phone', 'tablet', 'computer', 'tv'
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_start TIMESTAMP NOT NULL DEFAULT NOW(),
  session_end TIMESTAMP,
  duration_minutes INTEGER,
  active BOOLEAN NOT NULL DEFAULT true
);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: Create indexes for performance
-- ═══════════════════════════════════════════════════════════════════════════

-- Existing indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_content_filters_user_id ON content_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_content_filters_child_id ON content_filters(child_id);
CREATE INDEX IF NOT EXISTS idx_screen_time_settings_user_id ON screen_time_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_screen_time_settings_child_id ON screen_time_settings(child_id);
CREATE INDEX IF NOT EXISTS idx_trusted_websites_user_id ON trusted_websites(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_websites_child_id ON trusted_websites(child_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_settings_user_id ON monitoring_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_flagged ON games(flagged);

-- New indexes for enhanced tables
CREATE INDEX IF NOT EXISTS idx_screen_time_user_date ON screen_time(user_id, date);
CREATE INDEX IF NOT EXISTS idx_screen_time_date ON screen_time(date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_child_id ON alerts(child_id);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(read);
CREATE INDEX IF NOT EXISTS idx_child_profiles_user_id ON child_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_child_profiles_parent_id ON child_profiles(parent_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id ON device_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_active ON device_sessions(active);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 5: Insert default data for existing users
-- ═══════════════════════════════════════════════════════════════════════════

-- Insert default settings for existing users
INSERT INTO user_settings (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM user_settings);

INSERT INTO content_filters (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM content_filters);

INSERT INTO screen_time_settings (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM screen_time_settings);

INSERT INTO monitoring_settings (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM monitoring_settings);

-- Create child profiles for existing child users
INSERT INTO child_profiles (user_id, parent_id, age)
SELECT u.id, u.parent_id, 10 -- default age
FROM users u
WHERE u.role = 'child'
AND u.parent_id IS NOT NULL
AND u.id NOT IN (SELECT user_id FROM child_profiles);

-- Create today's screen time records for all users if they don't exist
INSERT INTO screen_time (user_id, date, allowed_time_minutes, used_time_minutes, daily_limits_total, daily_limits_gaming, daily_limits_social, daily_limits_educational, usage_today_total, usage_today_gaming, usage_today_social, usage_today_educational, time_rewards_scripture, time_rewards_lessons, time_rewards_chores)
SELECT
  id,
  CURRENT_DATE::TEXT,
  120, -- default allowed time
  0,   -- used time starts at 0
  120, -- total limit
  60,  -- gaming limit
  30,  -- social limit
  30,  -- educational limit
  0,   -- usage starts at 0
  0,   -- gaming usage
  0,   -- social usage
  0,   -- educational usage
  0,   -- scripture rewards
  0,   -- lesson rewards
  0    -- chore rewards
FROM users
WHERE id NOT IN (
  SELECT user_id FROM screen_time
  WHERE date = CURRENT_DATE::TEXT
);
