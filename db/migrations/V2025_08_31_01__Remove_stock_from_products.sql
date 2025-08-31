-- Remove stock column from products table
-- This column is no longer needed for business requirements

-- Remove the stock column
ALTER TABLE products DROP COLUMN IF EXISTS stock;