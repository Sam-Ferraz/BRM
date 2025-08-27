-- Remove client and value columns from sales_agenda table
-- These fields are no longer needed in the sales agenda functionality

ALTER TABLE sales_agenda 
DROP COLUMN IF EXISTS client,
DROP COLUMN IF EXISTS value;