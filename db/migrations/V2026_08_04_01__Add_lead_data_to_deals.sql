-- Separa "dados do lead recebido" (nome, email, telefone, form data original)
-- do campo Descrição (que agora e livre pro corretor titular o negocio).
--
-- ANTES: deals gerados por Lead tinham o texto bruto do webhook do Meta
-- gravado no campo `description` (misturava dado de origem com nota do
-- corretor).
--
-- AGORA: novo campo `lead_data` guarda o snapshot do lead; `description`
-- fica livre pro corretor escrever o que quiser (titulo do negocio,
-- observacoes, etc).

ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_data TEXT;

-- Migracao de dados existentes: pra deals de lead que tem "partir de Lead"
-- no description, move o conteudo pra lead_data e limpa description.
UPDATE deals
   SET lead_data = description,
       description = NULL
 WHERE client_origin = 'online_lead'
   AND description IS NOT NULL
   AND description LIKE '%partir de Lead%'
   AND lead_data IS NULL;
