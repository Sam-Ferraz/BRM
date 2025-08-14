-- Merge date and time columns in atendimentos table into a single datetime_agendamento column
-- V2025_08_14_01__Merge_atendimentos_date_time.sql

-- Add new datetime_agendamento column
ALTER TABLE atendimentos 
ADD COLUMN datetime_agendamento TIMESTAMP;

-- Migrate existing data by combining date and time columns
UPDATE atendimentos 
SET datetime_agendamento = (data::text || ' ' || hora::text)::timestamp
WHERE data IS NOT NULL AND hora IS NOT NULL;

-- Drop the old separate columns
ALTER TABLE atendimentos 
DROP COLUMN data,
DROP COLUMN hora;

-- Make the new column not null after data migration
ALTER TABLE atendimentos 
ALTER COLUMN datetime_agendamento SET NOT NULL;