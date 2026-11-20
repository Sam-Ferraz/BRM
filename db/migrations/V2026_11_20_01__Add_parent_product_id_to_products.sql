-- Suporta o tipo "Empreendimento" (lancamentos): um imovel pode ser "pai"
-- de varias unidades (apartamentos/salas/lotes) do mesmo empreendimento.
-- As unidades sao produtos normais na tabela products, apenas vinculadas
-- ao pai via parent_product_id.
--
-- ON DELETE SET NULL: se o empreendimento for excluido, as unidades nao
-- sao apagadas em cascata — ficam como imoveis avulsos. Decisao reversivel
-- (podemos migrar pra CASCADE depois se virar problema).

ALTER TABLE products
  ADD COLUMN parent_product_id INTEGER NULL
    REFERENCES products(id) ON DELETE SET NULL;

-- Indice pra acelerar a listagem "quais unidades pertencem a esse
-- empreendimento" (query frequente na UI de gestao do pai).
CREATE INDEX idx_products_parent_product_id
  ON products(parent_product_id)
  WHERE parent_product_id IS NOT NULL;
