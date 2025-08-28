-- Add image_url column to products table for storing S3 image paths
-- Path format: products/{product_id}/files/{uuid-filename.ext}

ALTER TABLE products 
ADD COLUMN image_url TEXT;

-- Add index for performance when querying products with images
CREATE INDEX idx_products_image_url ON products(image_url) WHERE image_url IS NOT NULL;

-- Add comment to document the column usage
COMMENT ON COLUMN products.image_url IS 'Relative path to product image in S3 bucket (e.g., products/123/files/uuid-image.jpg)';