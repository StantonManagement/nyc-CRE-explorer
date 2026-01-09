-- =====================================================================
-- NYC CRE Explorer - Safe Schema Migration
-- This file ADDS tables/columns if they are missing.
-- It DOES NOT delete or reset existing data.
-- Run this to update your schema to the latest version.
-- =====================================================================

-- 1. Violations Table
CREATE TABLE IF NOT EXISTS violations (
    id SERIAL PRIMARY KEY,
    bbl TEXT REFERENCES properties(bbl),
    violation_type TEXT, -- Renamed from 'type' to avoid keyword conflicts
    violation_id TEXT,
    description TEXT,
    status TEXT, -- 'Open', 'Closed'
    issue_date DATE,
    UNIQUE(bbl, violation_id)
);

-- 2. Permits Table
CREATE TABLE IF NOT EXISTS permits (
    id SERIAL PRIMARY KEY,
    bbl TEXT REFERENCES properties(bbl),
    job_number TEXT,
    permit_type TEXT, -- Renamed from 'type' to avoid keyword conflicts
    status TEXT,
    issue_date DATE,
    expiration_date DATE,
    UNIQUE(bbl, job_number)
);

-- 3. Properties Columns
ALTER TABLE properties ADD COLUMN IF NOT EXISTS distress_score INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS last_distress_update TIMESTAMP;

-- 4. Saved Searches
CREATE TABLE IF NOT EXISTS saved_searches (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    filters JSONB NOT NULL,
    alert_enabled BOOLEAN DEFAULT false,
    alert_frequency TEXT DEFAULT 'daily',
    last_alert_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Notes & Activity Log
CREATE TABLE IF NOT EXISTS property_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    bbl TEXT REFERENCES properties(bbl) ON DELETE CASCADE,
    content TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, bbl)
);

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    bbl TEXT,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Indexes (IF NOT EXISTS is built into most modern Postgres, but we use standard syntax)
CREATE INDEX IF NOT EXISTS idx_violations_bbl ON violations(bbl);
CREATE INDEX IF NOT EXISTS idx_permits_bbl ON permits(bbl);
CREATE INDEX IF NOT EXISTS idx_properties_distress ON properties(distress_score DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user_bbl ON activity_log(user_id, bbl);
CREATE INDEX IF NOT EXISTS idx_activity_user_date ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_bbl ON property_notes(user_id, bbl);

-- 7. Functions
CREATE OR REPLACE FUNCTION calculate_distress_scores()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE properties p
    SET 
        distress_score = (
            -- HPD Violations (1 point each, max 20)
            LEAST((SELECT COUNT(*) FROM violations v WHERE v.bbl = p.bbl AND v.violation_type = 'HPD' AND v.status = 'Open'), 20) +
            -- DOB Violations (5 points each, max 30)
            LEAST((SELECT COUNT(*) FROM violations v WHERE v.bbl = p.bbl AND v.violation_type = 'DOB' AND v.status = 'Open') * 5, 30)
        ),
        last_distress_update = NOW()
    WHERE true; 
END;
$$;

-- 8. RLS Policies
-- We drop existing policies to ensure we don't get "policy already exists" errors, 
-- OR we can just leave them if they are stable. 
-- For robustness, it's safer to DROP IF EXISTS and Re-Create for policies since they are metadata.

ALTER TABLE property_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage their own notes" ON property_notes;
    DROP POLICY IF EXISTS "Users can see their own activity" ON activity_log;
    DROP POLICY IF EXISTS "Users can insert their own activity" ON activity_log;
END $$;

CREATE POLICY "Users can manage their own notes" ON property_notes
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can see their own activity" ON activity_log
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity" ON activity_log
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

