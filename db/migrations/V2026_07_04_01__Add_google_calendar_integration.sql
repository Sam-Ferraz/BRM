-- V2026_07_04_01__Add_google_calendar_integration.sql
--
-- Integração unidirecional Google Calendar → BRM.
-- Cada usuário conecta a própria conta Google via OAuth 2.0. Guardamos o
-- refresh_token pra pedir novos access_tokens sem precisar reautenticar.
-- Credenciais do app (client_id/secret) ficam em env vars do backend — modelo SaaS.

CREATE TABLE IF NOT EXISTS user_google_calendar (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  connected_email   VARCHAR(255) NOT NULL,
  access_token      TEXT NOT NULL,
  refresh_token     TEXT NOT NULL,
  token_expires_at  TIMESTAMPTZ NOT NULL,
  scope             TEXT,
  last_sync_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_google_calendar_user_id
  ON user_google_calendar(user_id);

CREATE TRIGGER update_user_google_calendar_updated_at
BEFORE UPDATE ON user_google_calendar
FOR EACH ROW
EXECUTE FUNCTION update_chat_updated_at();
