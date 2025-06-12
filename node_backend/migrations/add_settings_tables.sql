-- Migration: Add settings and parental control tables
-- Created: 2024-01-01

-- Add new columns to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS platform VARCHAR(100),
ADD COLUMN IF NOT EXISTS flag_reason TEXT,
ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

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
