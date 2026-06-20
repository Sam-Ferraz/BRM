-- Módulo Leads
-- ---------------------------------------------------------------------------
-- Recebe leads das plataformas de anúncios (Meta, Google Ads, etc.) via
-- webhook + token manual (sem OAuth completo nesta versão). O admin cadastra
-- a "fonte" (lead_source) e o BRM expõe uma URL única de webhook autenticada
-- pelo `webhook_token`.
--
-- Fluxo:
--   1. Lead chega no webhook → criado com status='novo' (cai na Triagem)
--   2. Corretor "aceita" → status='aceito', cria Cliente + Negócio
--   3. Corretor "descarta" → status='descartado'
-- ---------------------------------------------------------------------------

-- Fontes de leads (uma página de anúncio ou um formulário, p.ex.)
CREATE TABLE IF NOT EXISTS lead_sources (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  type            VARCHAR(32)  NOT NULL DEFAULT 'meta'
                  CHECK (type IN ('meta', 'webhook_generic', 'manual')),
  -- Configuração específica por tipo (page_id, access_token, form_id, etc.)
  config          JSONB,
  -- Token único usado para autenticar chamadas no webhook /api/leads/webhook/:token
  webhook_token   VARCHAR(64) UNIQUE NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'paused')),
  last_lead_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_sources_type ON lead_sources (type);
CREATE INDEX IF NOT EXISTS idx_lead_sources_webhook_token ON lead_sources (webhook_token);

-- Leads recebidos
CREATE TABLE IF NOT EXISTS leads (
  id                    SERIAL PRIMARY KEY,
  source_id             INTEGER REFERENCES lead_sources(id) ON DELETE SET NULL,
  -- ID do lead na plataforma de origem (ex: leadgen_id do Meta)
  external_id           VARCHAR(120),
  name                  VARCHAR(255),
  email                 VARCHAR(255),
  phone                 VARCHAR(64),
  -- Snapshot completo dos campos do formulário em JSON
  form_data             JSONB,
  status                VARCHAR(16) NOT NULL DEFAULT 'novo'
                        CHECK (status IN ('novo', 'aceito', 'descartado')),
  -- Vínculos criados quando o lead é aceito
  client_id             INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  deal_id               INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  accepted_by_user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  accepted_at           TIMESTAMP,
  notes                 TEXT,
  received_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads (source_id);
CREATE INDEX IF NOT EXISTS idx_leads_received_at ON leads (received_at DESC);
-- Anti-duplicidade: o mesmo lead da Meta não deve ser inserido duas vezes
CREATE UNIQUE INDEX IF NOT EXISTS uniq_leads_source_external
  ON leads (source_id, external_id)
  WHERE external_id IS NOT NULL;

-- Trigger genérico para manter updated_at
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lead_sources_updated_at
  BEFORE UPDATE ON lead_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

CREATE TRIGGER trigger_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();
