-- Remove company column from clients
ALTER TABLE clients
  DROP COLUMN IF EXISTS company;
