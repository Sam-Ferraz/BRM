ALTER TABLE deals RENAME COLUMN value TO gsv;
ALTER TABLE deals RENAME COLUMN date TO origin_date;

ALTER TABLE deals
  ALTER COLUMN description DROP NOT NULL;

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS client_origin TEXT,
  ADD COLUMN IF NOT EXISTS purpose TEXT,
  ADD COLUMN IF NOT EXISTS deal_type TEXT,
  ADD COLUMN IF NOT EXISTS property_name TEXT,
  ADD COLUMN IF NOT EXISTS temperature TEXT;

ALTER TABLE deals
  ALTER COLUMN status TYPE TEXT USING status::text;

UPDATE deals SET status = 'proposal' WHERE status IN ('proposta', 'Proposta');
UPDATE deals SET status = 'sold' WHERE status IN ('venda_ganha', 'fechado', 'Fechado');
UPDATE deals SET status = 'discarded' WHERE status IN ('descartado', 'cancelado', 'Cancelado');
UPDATE deals SET status = 'service' WHERE status IN ('Em Andamento', 'em_andamento');
