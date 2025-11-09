ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS property_name TEXT;
