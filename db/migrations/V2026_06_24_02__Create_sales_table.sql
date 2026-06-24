-- Cria tabela sales para o módulo Vendas.
--
-- Fluxo de negócio:
--   1. Quando uma proposta vira status='accepted', ChatService trigger cria
--      automaticamente uma Sale com status='pending_approval' e seller_user_id
--      = user_id da proposta (corretor que solicitou).
--   2. O corretor preenche sale_date e faz upload do contrato (PDF).
--   3. Admin aprova → status='approved' + product.status='sold'.
--
-- Vínculo:
--   • proposal_id UNIQUE: 1 proposta = no máximo 1 venda. Se a venda for
--     rejeitada, a proposta pode ser re-aceita e nova sale é criada.
--     (Para permitir esse fluxo, ON DELETE CASCADE da proposta apaga sale.)
--   • deal_id denormalizado pra queries rápidas sem JOIN duplo.

CREATE TABLE IF NOT EXISTS sales (
  id                  SERIAL       PRIMARY KEY,
  proposal_id         INTEGER      NOT NULL UNIQUE REFERENCES proposals(id) ON DELETE CASCADE,
  deal_id             INTEGER      NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  seller_user_id      INTEGER      NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  sale_date           DATE         NULL,
  contract_url        TEXT         NULL,   -- caminho/URL do PDF no storage
  contract_filename   VARCHAR(255) NULL,   -- nome original do arquivo

  status              VARCHAR(20)  NOT NULL DEFAULT 'pending_approval',
  -- valores: pending_approval | approved | rejected

  approved_by_user_id INTEGER      NULL REFERENCES users(id) ON DELETE SET NULL,
  approved_at         TIMESTAMP    NULL,
  approval_notes      TEXT         NULL,

  created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_status         ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_seller         ON sales(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_sales_proposal       ON sales(proposal_id);
CREATE INDEX IF NOT EXISTS idx_sales_deal           ON sales(deal_id);
