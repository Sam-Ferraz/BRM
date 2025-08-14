-- Add preferences column to users table for cross-device synchronization
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{
  "language": "pt",
  "theme": "light", 
  "timezone": "America/Sao_Paulo"
}'::jsonb;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING gin(preferences);