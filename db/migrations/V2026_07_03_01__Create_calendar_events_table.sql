-- Módulo Agenda: compromissos manuais criados pelo próprio usuário.
--
-- A "agenda" do BRM é a UNIÃO de:
--   • calendar_events (esta tabela)   — compromissos livres cadastrados pelo user
--   • follow_ups em aberto             — next_action_date futura + completed=false
--   • (futuramente) appointments com scheduled_datetime, propostas com validity_date
--
-- Cada calendar_event pertence a um único usuário (dono). Admins podem ver
-- eventos de qualquer user (vista "time" no frontend).

CREATE TABLE IF NOT EXISTS calendar_events (
  id            SERIAL       PRIMARY KEY,
  user_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT         NULL,
  location      VARCHAR(255) NULL,
  start_at      TIMESTAMP    NOT NULL,
  end_at        TIMESTAMP    NULL,       -- NULL = evento sem hora final (ponto no tempo)
  all_day       BOOLEAN      NOT NULL DEFAULT FALSE,
  color         VARCHAR(20)  NULL,       -- hex ou nome (ex: '#3b82f6' ou 'blue')
  -- Vínculos opcionais com entidades do CRM (contexto do compromisso)
  client_id     INTEGER      NULL REFERENCES clients(id) ON DELETE SET NULL,
  deal_id       INTEGER      NULL REFERENCES deals(id) ON DELETE SET NULL,
  product_id    INTEGER      NULL REFERENCES products(id) ON DELETE SET NULL,
  -- Status (compromisso pode ser marcado como completo/cancelado)
  status        VARCHAR(20)  NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice principal: query da agenda é sempre por range [start_at, end_at]
-- e por user_id (ou sem user_id no caso do gestor vendo o time).
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_start
  ON calendar_events (user_id, start_at);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start
  ON calendar_events (start_at);

CREATE INDEX IF NOT EXISTS idx_calendar_events_status
  ON calendar_events (status)
  WHERE status = 'scheduled';

-- Triggers de updated_at (reaproveita a função criada em outra migration)
DROP TRIGGER IF EXISTS trigger_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER trigger_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_updated_at();  -- função genérica de touch em updated_at
