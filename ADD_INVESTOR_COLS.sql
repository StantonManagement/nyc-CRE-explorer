
-- Add investor-focused columns to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS year_altered INTEGER,
ADD COLUMN IF NOT EXISTS landmark TEXT,
ADD COLUMN IF NOT EXISTS lot_front NUMERIC,
ADD COLUMN IF NOT EXISTS lot_depth NUMERIC,
ADD COLUMN IF NOT EXISTS extension TEXT;

COMMENT ON COLUMN properties.year_altered IS 'Year of most recent major alteration (PLUTO YearAltered1)';
COMMENT ON COLUMN properties.landmark IS 'Landmark status (PLUTO Landmark)';
COMMENT ON COLUMN properties.lot_front IS 'Lot frontage in feet (PLUTO LotFront)';
COMMENT ON COLUMN properties.lot_depth IS 'Lot depth in feet (PLUTO LotDepth)';
