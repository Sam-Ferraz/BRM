-- Add product integration to sales_agenda table
-- This migration adds product_name and product_id fields to link sales agenda items with products

-- Add product_name column (required field)
ALTER TABLE sales_agenda 
ADD COLUMN product_name VARCHAR(255);

-- Add product_id column as foreign key to products table (optional for backward compatibility)
ALTER TABLE sales_agenda 
ADD COLUMN product_id INTEGER;

-- Add foreign key constraint to products table
ALTER TABLE sales_agenda 
ADD CONSTRAINT fk_sales_agenda_product_id 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_sales_agenda_product_id ON sales_agenda(product_id);
CREATE INDEX idx_sales_agenda_product_name ON sales_agenda(product_name);

-- Update existing records with a default product name (can be updated later via UI)
UPDATE sales_agenda SET product_name = 'Legacy Product' WHERE product_name IS NULL;

-- Make product_name required going forward
ALTER TABLE sales_agenda ALTER COLUMN product_name SET NOT NULL;