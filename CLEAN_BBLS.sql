-- Clean BBL format in properties table to match violations table
-- Step 1: Delete records with decimal suffixes where a clean version already exists
DELETE FROM properties 
WHERE bbl LIKE '%.%' 
  AND SPLIT_PART(bbl, '.', 1) IN (
    SELECT bbl FROM properties WHERE bbl NOT LIKE '%.%'
  );

-- Step 2: Clean remaining BBLs with decimal suffixes
UPDATE properties 
SET bbl = SPLIT_PART(bbl, '.', 1)
WHERE bbl LIKE '%.%';

-- Verify the cleanup
SELECT COUNT(*) as total_properties,
       COUNT(CASE WHEN bbl LIKE '%.%' THEN 1 END) as bbls_with_decimals
FROM properties;
