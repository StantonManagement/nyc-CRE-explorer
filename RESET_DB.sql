-- =====================================================================
-- DANGER: DATABASE RESET SCRIPT
-- This script WILL DELETE ALL DATA in your secondary tables.
-- Only run this if you want to completely reset the environment.
-- =====================================================================

-- Drop Tables
DROP TABLE IF EXISTS violations CASCADE;
DROP TABLE IF EXISTS permits CASCADE;
DROP TABLE IF EXISTS saved_searches CASCADE;
DROP TABLE IF EXISTS property_notes CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;

-- Reset Columns (Optional - usually we just leave them)
-- ALTER TABLE properties DROP COLUMN IF EXISTS distress_score;
-- ALTER TABLE properties DROP COLUMN IF EXISTS last_distress_update;

-- Re-run SUPABASE_SCHEMA.sql after this to re-create empty tables.
