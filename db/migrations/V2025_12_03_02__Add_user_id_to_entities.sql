-- Add user_id column to appointments, follow_ups, sales_agenda, and deals
-- Set default to first user to avoid breaking existing data

-- Add user_id to appointments
ALTER TABLE appointments ADD COLUMN user_id INTEGER;

-- Set existing records to first user
UPDATE appointments
SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1)
WHERE user_id IS NULL;

-- Make user_id NOT NULL and add foreign key
ALTER TABLE appointments
ALTER COLUMN user_id SET NOT NULL,
ADD CONSTRAINT fk_appointments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_appointments_user_id ON appointments(user_id);

-- Add user_id to follow_ups
ALTER TABLE follow_ups ADD COLUMN user_id INTEGER;

-- Set existing records to first user
UPDATE follow_ups
SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1)
WHERE user_id IS NULL;

-- Make user_id NOT NULL and add foreign key
ALTER TABLE follow_ups
ALTER COLUMN user_id SET NOT NULL,
ADD CONSTRAINT fk_follow_ups_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_follow_ups_user_id ON follow_ups(user_id);

-- Add user_id to sales_agenda
ALTER TABLE sales_agenda ADD COLUMN user_id INTEGER;

-- Set existing records to first user
UPDATE sales_agenda
SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1)
WHERE user_id IS NULL;

-- Make user_id NOT NULL and add foreign key
ALTER TABLE sales_agenda
ALTER COLUMN user_id SET NOT NULL,
ADD CONSTRAINT fk_sales_agenda_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_sales_agenda_user_id ON sales_agenda(user_id);

-- Add user_id to deals
ALTER TABLE deals ADD COLUMN user_id INTEGER;

-- Set existing records to first user
UPDATE deals
SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1)
WHERE user_id IS NULL;

-- Make user_id NOT NULL and add foreign key
ALTER TABLE deals
ALTER COLUMN user_id SET NOT NULL,
ADD CONSTRAINT fk_deals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_deals_user_id ON deals(user_id);
