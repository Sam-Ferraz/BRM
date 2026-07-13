-- Esteira de leads (lead pipelines / lead roulette)
--
-- Cada esteira define uma janela de horário do dia (hour_start .. hour_end),
-- uma lista ordenada de corretores, um gerente supervisor e um timeout de
-- aceitação em segundos. Quando chega um lead nessa janela, o sistema tenta
-- ofertar em ordem: se o corretor atual não aceita dentro do timeout, o lead
-- pula pro próximo da lista; se todos passarem, cai no gerente.
--
-- Este arquivo só cria as tabelas de configuração da esteira. A tabela de
-- assignments (histórico de tentativas por lead) virá numa migration futura
-- quando o fluxo de escalação for conectado ao webhook do Meta / criação
-- manual.

CREATE TABLE IF NOT EXISTS lead_pipelines (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(120) NOT NULL,
  -- Horário do dia em que a esteira está ativa (0..23, inclusivo nas 2 pontas).
  -- Ex: hour_start=8, hour_end=18 → ativa das 08:00 até 18:59.
  hour_start        SMALLINT NOT NULL CHECK (hour_start BETWEEN 0 AND 23),
  hour_end          SMALLINT NOT NULL CHECK (hour_end   BETWEEN 0 AND 23),
  -- Tempo (em segundos) que o corretor tem pra aceitar o lead antes do lead
  -- pular pro próximo da lista. Default 5 minutos.
  timeout_seconds   INTEGER NOT NULL DEFAULT 300 CHECK (timeout_seconds > 0),
  -- Gerente supervisor. Se toda a fila expirar, o lead cai aqui.
  manager_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_pipelines_active_hours
  ON lead_pipelines (is_active, hour_start, hour_end);

-- Corretores participantes de uma esteira, com ordem de precedência.
-- `position` é 0-based; menor posição = tenta primeiro.
CREATE TABLE IF NOT EXISTS lead_pipeline_members (
  id            SERIAL PRIMARY KEY,
  pipeline_id   INTEGER NOT NULL REFERENCES lead_pipelines(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Um corretor não pode aparecer duas vezes na mesma esteira
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lead_pipeline_member
  ON lead_pipeline_members (pipeline_id, user_id);

CREATE INDEX IF NOT EXISTS idx_lead_pipeline_members_order
  ON lead_pipeline_members (pipeline_id, position);

-- Trigger para manter updated_at
CREATE OR REPLACE FUNCTION update_lead_pipelines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_pipelines_updated_at ON lead_pipelines;
CREATE TRIGGER trg_lead_pipelines_updated_at
  BEFORE UPDATE ON lead_pipelines
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_pipelines_updated_at();
