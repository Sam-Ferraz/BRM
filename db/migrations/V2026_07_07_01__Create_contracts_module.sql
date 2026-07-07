-- V2026_07_07_01__Create_contracts_module.sql
--
-- Modulo Contrato — nova etapa entre Proposta e Venda.
--
-- Fluxo:
--   1. Proposta.status='accepted' -> cria Contract com status='pending_docs'
--   2. Corretor faz upload de DOCUMENTOS do cliente (RG, IPTU, matricula, etc)
--   3. Corretor envia pro Juridico (status='awaiting_legal')
--   4. Juridico revisa:
--      - REPROVA -> status='legal_rejected' (corretor revisa docs)
--      - APROVA + anexa CONTRATO -> status='awaiting_manager'
--   5. Gestor revisa TUDO:
--      - REPROVA -> status='manager_rejected'
--      - APROVA -> status='approved' + dispara criacao de Sale
--
-- IMPORTANTE: o Deal permanece com status 'contract' (nao 'sold') ate o gestor
-- aprovar. Se rejeitar em qualquer etapa, continua em 'contract'.

-- =============================================================================
-- Tabela CONTRACTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS contracts (
  id            SERIAL PRIMARY KEY,
  deal_id       INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  proposal_id   INTEGER NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  -- Corretor responsavel — quem criou o negocio original
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- Fluxo de aprovacao
  status        VARCHAR(30) NOT NULL DEFAULT 'pending_docs',
  -- Valores finais (podem diferir da proposta original — gestor ajusta)
  final_value   DECIMAL(15, 2),
  signed_at     TIMESTAMPTZ,
  -- Feedback / observacoes em cada etapa
  legal_notes   TEXT,    -- justificativa do juridico ao rejeitar/aprovar
  manager_notes TEXT,    -- observacoes do gestor
  -- Auditoria
  legal_reviewed_by     INTEGER REFERENCES users(id),
  legal_reviewed_at     TIMESTAMPTZ,
  manager_reviewed_by   INTEGER REFERENCES users(id),
  manager_reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contracts_status_check
    CHECK (status IN (
      'pending_docs',
      'awaiting_legal',
      'legal_rejected',
      'awaiting_manager',
      'manager_rejected',
      'approved'
    )),
  -- Uma proposta so pode gerar 1 contrato (evita duplicacao caso aprove 2x)
  CONSTRAINT contracts_proposal_unique UNIQUE (proposal_id)
);

CREATE INDEX IF NOT EXISTS idx_contracts_deal      ON contracts (deal_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status    ON contracts (status);
CREATE INDEX IF NOT EXISTS idx_contracts_user      ON contracts (user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_created   ON contracts (created_at DESC);

-- Trigger de updated_at
CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON contracts
FOR EACH ROW
EXECUTE FUNCTION update_chat_updated_at();

-- =============================================================================
-- Tabela CONTRACT_DOCUMENTS (multiplos anexos: documentos do cliente + contrato)
-- =============================================================================
CREATE TABLE IF NOT EXISTS contract_documents (
  id            SERIAL PRIMARY KEY,
  contract_id   INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  uploader_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- Tipo: 'client_doc' (RG, IPTU, matricula, etc — corretor sobe)
  --       'contract'   (o contrato em si — juridico sobe)
  doc_type      VARCHAR(20) NOT NULL,
  filename      VARCHAR(255) NOT NULL,
  file_url      TEXT NOT NULL,
  file_size     INTEGER,          -- bytes; opcional
  mime_type     VARCHAR(100),     -- application/pdf, image/jpeg, etc
  display_order INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,             -- descricao opcional do arquivo
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contract_documents_type_check
    CHECK (doc_type IN ('client_doc', 'contract'))
);

CREATE INDEX IF NOT EXISTS idx_contract_docs_contract ON contract_documents (contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_docs_type     ON contract_documents (contract_id, doc_type);

-- =============================================================================
-- Novo status no funil do Deal: 'contract' (entre 'proposal' e 'sold')
-- =============================================================================
-- Nao ha CHECK constraint em deals.status hoje (e uma coluna VARCHAR livre),
-- entao nada precisa ser alterado no schema. O novo valor 'contract' passa
-- a ser aceito automaticamente. Codigo do frontend/backend usa esse valor
-- pra alocar a nova coluna no Kanban.
