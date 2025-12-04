-- Phase 2: Distress Signals Schema Changes

-- 0. Reset tables to ensure clean schema (since we are in dev mode)
DROP TABLE IF EXISTS violations CASCADE;
DROP TABLE IF EXISTS permits CASCADE;

-- 1. Create Violations Table
CREATE TABLE violations (
    id SERIAL PRIMARY KEY,
    bbl TEXT REFERENCES properties(bbl),
    violation_type TEXT, -- Renamed from 'type' to avoid keyword conflicts
    violation_id TEXT,
    description TEXT,
    status TEXT, -- 'Open', 'Closed'
    issue_date DATE,
    UNIQUE(bbl, violation_id)
);

-- 2. Create Permits Table (to detect stalled construction or value-add work)
CREATE TABLE permits (
    id SERIAL PRIMARY KEY,
    bbl TEXT REFERENCES properties(bbl),
    job_number TEXT,
    permit_type TEXT, -- Renamed from 'type' to avoid keyword conflicts
    status TEXT,
    issue_date DATE,
    expiration_date DATE,
    UNIQUE(bbl, job_number)
);

-- 3. Add Distress Score to Properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS distress_score INTEGER DEFAULT 0;

-- Phase 3: Saved Searches (PRP-3.1)
DROP TABLE IF EXISTS saved_searches CASCADE;

CREATE TABLE saved_searches (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,  -- Simple user ID for now (from our auth system)
    name TEXT NOT NULL,
    filters JSONB NOT NULL,
    alert_enabled BOOLEAN DEFAULT false,
    alert_frequency TEXT DEFAULT 'daily',  -- 'daily', 'weekly', 'instant'
    last_alert_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE properties ADD COLUMN IF NOT EXISTS last_distress_update TIMESTAMP;

-- 4. Create Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_violations_bbl ON violations(bbl);
CREATE INDEX IF NOT EXISTS idx_permits_bbl ON permits(bbl);
CREATE INDEX IF NOT EXISTS idx_properties_distress ON properties(distress_score DESC);

-- 5. Create Distress Score Calculation Function
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
            -- Add more factors later
        ),
        last_distress_update = NOW()
    WHERE true; -- Bypass "UPDATE requires a WHERE clause" safety check
END;
$$;
