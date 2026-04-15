-- Migrate existing status values to new combined status+temperature values
UPDATE deals SET status = 
  CASE 
    WHEN status = 'service' AND temperature = 'warm' THEN 'service_warm'
    WHEN status = 'service' AND temperature = 'mild' THEN 'service_mild'
    WHEN status = 'service' AND temperature = 'cold' THEN 'service_cold'
    WHEN status = 'visit_foreseen' AND temperature = 'warm' THEN 'visit_foreseen_warm'
    WHEN status = 'visit_foreseen' AND temperature = 'mild' THEN 'visit_foreseen_mild'
    WHEN status = 'visit_foreseen' AND temperature = 'cold' THEN 'visit_foreseen_cold'
    WHEN status = 'visit_done' AND temperature = 'warm' THEN 'visit_done_warm'
    WHEN status = 'visit_done' AND temperature = 'mild' THEN 'visit_done_mild'
    WHEN status = 'visit_done' AND temperature = 'cold' THEN 'visit_done_cold'
    WHEN status = 'proposal' THEN 'proposal'
    WHEN status = 'sold' THEN 'sold'
    WHEN status = 'discarded' THEN 'discarded_no_interest'
    ELSE 'service_warm'
  END;

-- Remove temperature column
ALTER TABLE deals DROP COLUMN IF EXISTS temperature;
