-- Step 1: Change status column to text temporarily
ALTER TABLE deals ALTER COLUMN status TYPE VARCHAR(50);

-- Step 2: Drop old enum
DROP TYPE IF EXISTS deal_status;

-- Step 3: Migrate existing values to new ones
UPDATE deals SET status = 'service_warm' WHERE status IN ('proposta', 'fechado', 'cancelado', 'descartado', 'venda_ganha') OR status IS NULL;
UPDATE deals SET status = 'sold' WHERE status = 'venda_ganha';
UPDATE deals SET status = 'discarded_no_interest' WHERE status = 'descartado';
UPDATE deals SET status = 'proposal' WHERE status = 'proposta';

-- Step 4: Drop temperature column if exists
ALTER TABLE deals DROP COLUMN IF EXISTS temperature;
