-- Add category field to products (off-plan or completed)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'completed';
