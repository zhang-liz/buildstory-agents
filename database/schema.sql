-- BuildStory.Agents Database Schema
-- Run this in your Supabase SQL editor to set up the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stories table - stores basic story information
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brief TEXT NOT NULL,
    brand JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storyboards table - stores generated storyboard versions
CREATE TABLE IF NOT EXISTS storyboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    persona TEXT NOT NULL CHECK (persona IN ('athlete', 'commuter', 'outdoor', 'family')),
    variant_hash TEXT NOT NULL,
    json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bandit state table - stores multi-armed bandit parameters
CREATE TABLE IF NOT EXISTS bandit_state (
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    variant_hash TEXT NOT NULL,
    alpha INTEGER NOT NULL DEFAULT 1,
    beta INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (story_id, section_key, variant_hash)
);

-- Events table - stores user interaction events
CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    persona TEXT CHECK (persona IN ('athlete', 'commuter', 'outdoor', 'family')),
    section_key TEXT,
    variant_hash TEXT,
    event TEXT NOT NULL,
    meta JSONB DEFAULT '{}',
    ts TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_storyboards_story_persona ON storyboards(story_id, persona);
CREATE INDEX IF NOT EXISTS idx_storyboards_created_at ON storyboards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bandit_state_story_section ON bandit_state(story_id, section_key);
CREATE INDEX IF NOT EXISTS idx_events_story_id ON events(story_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_story_section_variant ON events(story_id, section_key, variant_hash);

-- Function to automatically update bandit_state.updated_at
CREATE OR REPLACE FUNCTION update_bandit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on bandit_state changes
DROP TRIGGER IF EXISTS trigger_update_bandit_updated_at ON bandit_state;
CREATE TRIGGER trigger_update_bandit_updated_at
    BEFORE UPDATE ON bandit_state
    FOR EACH ROW
    EXECUTE FUNCTION update_bandit_updated_at();

-- RLS (Row Level Security) policies for security
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE storyboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE bandit_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (in production, you'd want more restrictive policies)
CREATE POLICY "Allow all operations on stories" ON stories FOR ALL USING (true);
CREATE POLICY "Allow all operations on storyboards" ON storyboards FOR ALL USING (true);
CREATE POLICY "Allow all operations on bandit_state" ON bandit_state FOR ALL USING (true);
CREATE POLICY "Allow all operations on events" ON events FOR ALL USING (true);


-- View for analytics (helpful for debugging)
CREATE OR REPLACE VIEW event_analytics AS
SELECT
    story_id,
    event,
    persona,
    section_key,
    COUNT(*) as event_count,
    DATE_TRUNC('hour', ts) as hour
FROM events
GROUP BY story_id, event, persona, section_key, DATE_TRUNC('hour', ts)
ORDER BY hour DESC;
