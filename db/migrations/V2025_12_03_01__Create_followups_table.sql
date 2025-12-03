-- Create follow_ups table
CREATE TABLE IF NOT EXISTS follow_ups (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
  next_action TEXT NOT NULL,
  next_action_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_followups_appointment_id ON follow_ups(appointment_id);
CREATE INDEX IF NOT EXISTS idx_followups_next_action_date ON follow_ups(next_action_date);
CREATE INDEX IF NOT EXISTS idx_followups_completed ON follow_ups(completed);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_followups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_followups_updated_at
  BEFORE UPDATE ON follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION update_followups_updated_at();
