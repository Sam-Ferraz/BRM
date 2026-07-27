-- Multi-tenancy: introduz tabela accounts + coluna account_id em toda tabela
-- de dados do cliente. Modelo Shared DB + account_id (padrão SaaS moderno).
--
-- Migração é feita em 3 passos por tabela pra ser segura:
--   1. ADD COLUMN account_id INT (nullable, sem FK ainda)
--   2. UPDATE ... SET account_id = 1  (todas as linhas existentes vão pra "BRM Demo")
--   3. ALTER COLUMN account_id SET NOT NULL + adiciona FK
--
-- Se der problema em qualquer passo, dá pra reverter dropando a coluna.
--
-- Tabelas globais que NÃO recebem account_id (dados de sistema, não de cliente):
--   accounts, permissions, role_permissions, applied_migrations,
--   flyway_schema_history.
--
-- Tabelas indiretas que também NÃO recebem account_id (herdam via FK):
--   product_images (via products), contract_documents (via contracts),
--   messages (via conversations), lead_pipeline_members (via lead_pipelines),
--   user_permission_overrides (via users).
--
-- Motivo: acesso a essas tabelas sempre passa pela pai, então o isolamento
-- é garantido via JOIN. Adicionar account_id aqui só duplicaria dado.

-- =============================================================================
-- 1. Tabela accounts
-- =============================================================================

CREATE TABLE IF NOT EXISTS accounts (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  plan           VARCHAR(30) NOT NULL DEFAULT 'trial'
                 CHECK (plan IN ('trial', 'basic', 'pro', 'enterprise')),
  custom_config  JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active);

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION update_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON accounts;
CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_accounts_updated_at();

-- Cria a account inicial "BRM Demo" (id=1) — hospeda todos os dados atuais
INSERT INTO accounts (id, name, plan, custom_config, is_active)
VALUES (1, 'BRM Demo', 'pro', '{}'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

-- Garante que próximo INSERT continua do id 2
SELECT setval('accounts_id_seq', GREATEST(1, (SELECT MAX(id) FROM accounts)));

-- =============================================================================
-- 2. Adiciona account_id em todas as tabelas de dados
--    (mesma estrutura repetida — nullable → populate → NOT NULL + FK)
-- =============================================================================

-- --- users -----------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_id INTEGER;
UPDATE users SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE users ALTER COLUMN account_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_account') THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_users_account ON users(account_id);

-- --- deals -----------------------------------------------------------------
ALTER TABLE deals ADD COLUMN IF NOT EXISTS account_id INTEGER;
UPDATE deals SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE deals ALTER COLUMN account_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_deals_account') THEN
    ALTER TABLE deals ADD CONSTRAINT fk_deals_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_deals_account ON deals(account_id);
CREATE INDEX IF NOT EXISTS idx_deals_account_updated ON deals(account_id, updated_at DESC);

-- --- clients ---------------------------------------------------------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS account_id INTEGER;
UPDATE clients SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE clients ALTER COLUMN account_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_clients_account') THEN
    ALTER TABLE clients ADD CONSTRAINT fk_clients_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_clients_account ON clients(account_id);

-- --- products --------------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS account_id INTEGER;
UPDATE products SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE products ALTER COLUMN account_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_account') THEN
    ALTER TABLE products ADD CONSTRAINT fk_products_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_products_account ON products(account_id);

-- --- appointments ----------------------------------------------------------
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS account_id INTEGER;
UPDATE appointments SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE appointments ALTER COLUMN account_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_appointments_account') THEN
    ALTER TABLE appointments ADD CONSTRAINT fk_appointments_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_appointments_account ON appointments(account_id);

-- --- follow_ups ------------------------------------------------------------
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS account_id INTEGER;
UPDATE follow_ups SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE follow_ups ALTER COLUMN account_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_follow_ups_account') THEN
    ALTER TABLE follow_ups ADD CONSTRAINT fk_follow_ups_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_follow_ups_account ON follow_ups(account_id);

-- --- proposals -------------------------------------------------------------
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS account_id INTEGER;
UPDATE proposals SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE proposals ALTER COLUMN account_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_proposals_account') THEN
    ALTER TABLE proposals ADD CONSTRAINT fk_proposals_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_proposals_account ON proposals(account_id);

-- --- contracts -------------------------------------------------------------
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS account_id INTEGER;
UPDATE contracts SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE contracts ALTER COLUMN account_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_contracts_account') THEN
    ALTER TABLE contracts ADD CONSTRAINT fk_contracts_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_contracts_account ON contracts(account_id);

-- --- sales -----------------------------------------------------------------
ALTER TABLE sales ADD COLUMN IF NOT EXISTS account_id INTEGER;
UPDATE sales SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE sales ALTER COLUMN account_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_account') THEN
    ALTER TABLE sales ADD CONSTRAINT fk_sales_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_sales_account ON sales(account_id);

-- --- leads -----------------------------------------------------------------
ALTER TABLE leads ADD COLUMN IF NOT EXISTS account_id INTEGER;
UPDATE leads SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE leads ALTER COLUMN account_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leads_account') THEN
    ALTER TABLE leads ADD CONSTRAINT fk_leads_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_leads_account ON leads(account_id);

-- --- lead_sources ----------------------------------------------------------
ALTER TABLE lead_sources ADD COLUMN IF NOT EXISTS account_id INTEGER;
UPDATE lead_sources SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE lead_sources ALTER COLUMN account_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lead_sources_account') THEN
    ALTER TABLE lead_sources ADD CONSTRAINT fk_lead_sources_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_lead_sources_account ON lead_sources(account_id);

-- --- lead_pipelines --------------------------------------------------------
ALTER TABLE lead_pipelines ADD COLUMN IF NOT EXISTS account_id INTEGER;
UPDATE lead_pipelines SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE lead_pipelines ALTER COLUMN account_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lead_pipelines_account') THEN
    ALTER TABLE lead_pipelines ADD CONSTRAINT fk_lead_pipelines_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_lead_pipelines_account ON lead_pipelines(account_id);

-- --- conversations ---------------------------------------------------------
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS account_id INTEGER;
UPDATE conversations SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE conversations ALTER COLUMN account_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_conversations_account') THEN
    ALTER TABLE conversations ADD CONSTRAINT fk_conversations_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_conversations_account ON conversations(account_id);

-- --- whatsapp_sessions -----------------------------------------------------
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS account_id INTEGER;
UPDATE whatsapp_sessions SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE whatsapp_sessions ALTER COLUMN account_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_sessions_account') THEN
    ALTER TABLE whatsapp_sessions ADD CONSTRAINT fk_whatsapp_sessions_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_account ON whatsapp_sessions(account_id);

-- --- calendar_events -------------------------------------------------------
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS account_id INTEGER;
UPDATE calendar_events SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE calendar_events ALTER COLUMN account_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_calendar_events_account') THEN
    ALTER TABLE calendar_events ADD CONSTRAINT fk_calendar_events_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_calendar_events_account ON calendar_events(account_id);

-- --- sales_agenda (legacy — mantido pra compat) ----------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_agenda') THEN
    ALTER TABLE sales_agenda ADD COLUMN IF NOT EXISTS account_id INTEGER;
    UPDATE sales_agenda SET account_id = 1 WHERE account_id IS NULL;
    ALTER TABLE sales_agenda ALTER COLUMN account_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_agenda_account') THEN
      ALTER TABLE sales_agenda ADD CONSTRAINT fk_sales_agenda_account
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
    END IF;
    CREATE INDEX IF NOT EXISTS idx_sales_agenda_account ON sales_agenda(account_id);
  END IF;
END $$;

-- --- user_google_calendar --------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_google_calendar') THEN
    ALTER TABLE user_google_calendar ADD COLUMN IF NOT EXISTS account_id INTEGER;
    UPDATE user_google_calendar SET account_id = 1 WHERE account_id IS NULL;
    ALTER TABLE user_google_calendar ALTER COLUMN account_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_google_calendar_account') THEN
      ALTER TABLE user_google_calendar ADD CONSTRAINT fk_user_google_calendar_account
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
    END IF;
    CREATE INDEX IF NOT EXISTS idx_user_google_calendar_account ON user_google_calendar(account_id);
  END IF;
END $$;
