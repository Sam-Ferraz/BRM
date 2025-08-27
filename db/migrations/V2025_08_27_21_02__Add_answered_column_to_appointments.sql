-- Add answered boolean column to appointments table
-- This tracks whether the client answered the appointment or not

ALTER TABLE appointments 
ADD COLUMN answered BOOLEAN NOT NULL DEFAULT false;