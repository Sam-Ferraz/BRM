-- Adiciona campos financeiros à tabela proposals.
--
-- • vgv                 — Valor Geral de Vendas (decimal/moeda)
-- • vgc                 — Volume Geral de Comissão (decimal/moeda)
-- • intermediation_rate — Taxa de Intermediação em percentual (ex: 6.00 = 6%)
--
-- Todos nullable porque propostas antigas não têm esses dados.

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS vgv                 NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS vgc                 NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS intermediation_rate NUMERIC(5, 2);
