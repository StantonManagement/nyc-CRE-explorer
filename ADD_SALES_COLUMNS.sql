
-- Add last_sale_date and last_sale_price to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS last_sale_date DATE,
ADD COLUMN IF NOT EXISTS last_sale_price NUMERIC;

-- Update the comment to reflect the source
COMMENT ON COLUMN properties.last_sale_date IS 'Date of the last sale from PLUTO data';
COMMENT ON COLUMN properties.last_sale_price IS 'Price of the last sale from PLUTO data';
