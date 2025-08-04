-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    role TEXT NOT NULL DEFAULT 'child',
    parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(255) NOT NULL DEFAULT '',
    last_name VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Devotionals Table
CREATE TABLE IF NOT EXISTS devotionals (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    verse TEXT NOT NULL,
    reference VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    date DATE NOT NULL,
    image TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Lessons Table
CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    verse_ref VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    age_range VARCHAR(50) NOT NULL,
    scripture_references TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Lesson Progress Table
CREATE TABLE IF NOT EXISTS lesson_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP
);

-- Child Activity Logs Table
CREATE TABLE IF NOT EXISTS child_activity_logs (
    id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_name VARCHAR(255) NOT NULL,
    platform VARCHAR(50),
    duration_minutes INTEGER,
    content_category VARCHAR(50),
    content_rating VARCHAR(10),
    flagged BOOLEAN DEFAULT FALSE,
    flag_reason VARCHAR(255),
    ai_analysis TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Content Analysis Table
CREATE TABLE IF NOT EXISTS content_analysis (
    id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    platform VARCHAR(50),
    url TEXT,
    ai_analysis TEXT NOT NULL,
    safety_score INTEGER,
    content_themes TEXT,
    recommended_age VARCHAR(20),
    parent_guidance_needed BOOLEAN DEFAULT FALSE,
    guidance_notes TEXT,
    reviewed_by_parent BOOLEAN DEFAULT FALSE,
    approved BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Weekly Content Summaries Table
CREATE TABLE IF NOT EXISTS weekly_content_summaries (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES users(id),
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    summary_content TEXT NOT NULL,
    parental_advice TEXT NOT NULL,
    discussion_topics TEXT,
    spiritual_guidance TEXT NOT NULL,
    concerning_content TEXT,
    positive_highlights TEXT,
    recommended_actions TEXT,
    prayer_suggestions TEXT,
    generated_at TIMESTAMP DEFAULT NOW(),
    reviewed BOOLEAN DEFAULT FALSE,
    sent_to_parent BOOLEAN DEFAULT FALSE
);

-- LLM Generated Content Table
CREATE TABLE IF NOT EXISTS llm_generated_content (
    id SERIAL PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL,
    prompt TEXT NOT NULL,
    system_prompt TEXT,
    generated_content TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    child_id INTEGER REFERENCES users(id),
    context VARCHAR(100),
    tokens_used INTEGER,
    generation_time_ms INTEGER,
    quality_rating INTEGER,
    reviewed BOOLEAN DEFAULT FALSE,
    approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
