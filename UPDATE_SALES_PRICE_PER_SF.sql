-- Update sales table to calculate price_per_sf from properties.bldgarea
-- This fixes the issue where gross_sf is null and price_per_sf can't be calculated

UPDATE sales s
SET 
    gross_sf = p.bldgarea,
    price_per_sf = CASE 
        WHEN p.bldgarea > 0 AND s.sale_price > 0 
        THEN ROUND(s.sale_price::numeric / p.bldgarea::numeric)
        ELSE NULL
    END
FROM properties p
WHERE s.bbl = p.bbl
  AND s.sale_price > 0
  AND p.bldgarea > 0;

-- Verify the update
SELECT 
    COUNT(*) as total_sales,
    COUNT(price_per_sf) as sales_with_price_per_sf,
    ROUND(AVG(price_per_sf)) as avg_price_per_sf
FROM sales
WHERE sale_price > 0;
