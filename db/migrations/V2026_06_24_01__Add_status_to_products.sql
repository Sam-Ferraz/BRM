-- Adiciona campo "status" enum em products: available / inactive / sold.
--
-- Substitui conceitualmente o boolean available_for_sale, mas o mantemos
-- por enquanto para retrocompatibilidade — código será migrado pra usar
-- status, e numa migration futura podemos remover available_for_sale.
--
-- Migração de dados:
--   available_for_sale = TRUE   → status = 'available'
--   available_for_sale = FALSE  → status = 'inactive'
-- (Nenhum imóvel está como 'sold' ainda nesse momento.)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'available';

-- Migra valores existentes do boolean para o enum.
UPDATE products
   SET status = CASE
     WHEN available_for_sale = TRUE  THEN 'available'
     WHEN available_for_sale = FALSE THEN 'inactive'
     ELSE 'available'
   END
 WHERE status = 'available'; -- só os que ficaram no default ainda

-- Índice pra filtro por status (Vitrine, tabelas etc).
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
