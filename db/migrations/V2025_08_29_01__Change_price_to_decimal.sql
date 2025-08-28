-- Change product price from VARCHAR to DECIMAL(10,2)
-- This allows storing prices up to 99,999,999.99

-- First, let's safely convert existing price data
-- Step 1: Add temporary column with DECIMAL type
ALTER TABLE products 
ADD COLUMN price_temp DECIMAL(10,2);

-- Step 2: Convert existing VARCHAR prices to DECIMAL
-- Handle empty strings and invalid values by setting them to NULL
UPDATE products 
SET price_temp = CASE 
    WHEN price IS NULL OR price = '' OR price = '0' THEN NULL
    WHEN price ~ '^[0-9]+(\.[0-9]{1,2})?$' THEN price::DECIMAL(10,2)
    ELSE NULL
END;

-- Step 3: Drop the old VARCHAR price column
ALTER TABLE products 
DROP COLUMN price;

-- Step 4: Rename the new column to 'price'
ALTER TABLE products 
RENAME COLUMN price_temp TO price;

-- Step 5: Add comment for documentation
COMMENT ON COLUMN products.price IS 'Product price in decimal format (max 99,999,999.99)';