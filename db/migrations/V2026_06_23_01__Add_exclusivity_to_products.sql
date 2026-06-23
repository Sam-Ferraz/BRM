-- Adiciona campo "exclusivity" na tabela products.
--
-- Indica se o imóvel está em regime de exclusividade com a imobiliária
-- (Sim/Não). Default FALSE.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS exclusivity BOOLEAN NOT NULL DEFAULT FALSE;
