-- Multiplos funis por conta (padrao Pipedrive/HubSpot).
--
-- Antes: um unico kanban por account, com colunas customizadas via
-- accounts.custom_config.pipeline_columns + pipeline_extra_columns.
-- Agora: cada account pode ter varios funis (Vendas, Locacao, Lancamento),
-- cada funil com suas proprias colunas e deals vinculados.
--
-- Migration preserva o fluxo atual: para cada account existente, cria um
-- funil chamado 'Principal' que herda o custom_config da conta. Todos os
-- deals existentes vinculam a esse funil default. O admin pode renomear,
-- criar outros funis e mover deals entre eles depois.

CREATE TABLE pipelines (
  id              SERIAL PRIMARY KEY,
  account_id      INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  color           VARCHAR(16) DEFAULT '#0c343d',
  position        INTEGER NOT NULL DEFAULT 0,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  custom_config   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, name)
);

CREATE INDEX idx_pipelines_account ON pipelines(account_id);

-- Garante que so UM funil por conta seja is_default = true (parcial unique
-- index onde is_default=true).
CREATE UNIQUE INDEX idx_pipelines_account_default
  ON pipelines(account_id)
  WHERE is_default = TRUE;

-- Deals ganham FK opcional pro funil. ON DELETE SET NULL: se o funil for
-- excluido, os deals viram "sem funil" em vez de serem apagados em cascata
-- (admin reclassifica depois). Pipeline_id e opcional pra manter compat
-- com qualquer codigo que ainda nao passa pipeline_id no insert.
ALTER TABLE deals ADD COLUMN pipeline_id INTEGER REFERENCES pipelines(id) ON DELETE SET NULL;
CREATE INDEX idx_deals_pipeline ON deals(pipeline_id);

-- Seed: cria o funil 'Principal' pra cada conta existente, herdando o
-- custom_config da propria conta.
INSERT INTO pipelines (account_id, name, color, position, is_default, custom_config)
SELECT
  a.id,
  'Principal',
  '#0c343d',
  0,
  TRUE,
  COALESCE(a.custom_config, '{}'::jsonb)
FROM accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM pipelines p WHERE p.account_id = a.id AND p.name = 'Principal'
);

-- Vincula todos os deals existentes ao funil Principal da respectiva conta.
UPDATE deals d
SET pipeline_id = p.id
FROM pipelines p
WHERE p.account_id = d.account_id
  AND p.is_default = TRUE
  AND d.pipeline_id IS NULL;
