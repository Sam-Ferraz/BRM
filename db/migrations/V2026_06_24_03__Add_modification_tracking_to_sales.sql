-- Adiciona tracking de "última alteração" na tabela sales.
--
-- Pra cada update relevante (dados, contrato, aprovação) o backend popula
-- esses campos para exibir uma seção "Alterado por: <nome>, Em: <data>"
-- no detalhe da venda. A coluna updated_at já existe e é mantida pelo
-- repositório; aqui guardamos especificamente QUEM alterou.

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS last_modified_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_sales_last_modified_by ON sales(last_modified_by_user_id);
