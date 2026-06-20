-- Add client_name to follow_ups so a follow-up can stand alone (no appointment FK required).
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);

-- Backfill from linked appointment when present
UPDATE follow_ups f
SET client_name = a.client
FROM appointments a
WHERE f.appointment_id = a.id
  AND f.client_name IS NULL;

-- Fallback for any orphan rows (appointment_id NULL or referenced row gone)
UPDATE follow_ups
SET client_name = '—'
WHERE client_name IS NULL;

ALTER TABLE follow_ups ALTER COLUMN client_name SET NOT NULL;

-- Index for case-insensitive client lookups
CREATE INDEX IF NOT EXISTS idx_followups_client_name ON follow_ups (lower(client_name));
