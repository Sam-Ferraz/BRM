-- Add support for multiple images per product with thumbnail selection
-- Replace single image_url with a proper images table

-- Create product_images table
CREATE TABLE product_images (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_thumbnail BOOLEAN NOT NULL DEFAULT FALSE,
    alt_text VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_thumbnail ON product_images(product_id, is_thumbnail) WHERE is_thumbnail = TRUE;
CREATE INDEX idx_product_images_order ON product_images(product_id, display_order);

-- Add unique constraint to ensure only one thumbnail per product
CREATE UNIQUE INDEX idx_product_images_unique_thumbnail ON product_images(product_id) WHERE is_thumbnail = TRUE;

-- Migrate existing image_url data to new table
INSERT INTO product_images (product_id, image_url, display_order, is_thumbnail, alt_text)
SELECT 
    id as product_id,
    image_url,
    1 as display_order,
    TRUE as is_thumbnail,
    name as alt_text
FROM products 
WHERE image_url IS NOT NULL;

-- Remove the old image_url column
ALTER TABLE products DROP COLUMN image_url;

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_images_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_images_updated_at 
    BEFORE UPDATE ON product_images 
    FOR EACH ROW 
    EXECUTE FUNCTION update_product_images_updated_at_column();

-- Add comments to document the table structure
COMMENT ON TABLE product_images IS 'Stores multiple images for each product with thumbnail selection and ordering';
COMMENT ON COLUMN product_images.image_url IS 'Relative path to product image in S3 bucket (e.g., products/123/files/uuid-image.jpg)';
COMMENT ON COLUMN product_images.display_order IS 'Order for displaying images (1 = first, 2 = second, etc.)';
COMMENT ON COLUMN product_images.is_thumbnail IS 'Whether this image is the product thumbnail (only one per product)';
COMMENT ON COLUMN product_images.alt_text IS 'Alternative text for accessibility and SEO';