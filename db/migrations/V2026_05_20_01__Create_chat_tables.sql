-- Módulo Chat (WhatsApp)
-- ---------------------------------------------------------------------------
-- Modelagem para integração futura com WhatsApp. Implementação inicial usa
-- adapter stub (sem rede), mas o schema já comporta:
--   • whatsapp_sessions  → vínculo 1:1 entre usuário do BRM e número WhatsApp
--   • conversations      → uma linha por (dono, contato_phone)
--   • messages           → histórico de mensagens (entrada e saída)
-- O dono da conversa é o usuário que está conectado ao WhatsApp; admin vê
-- todas as conversas, corretor vê apenas as do próprio user_id.
-- ---------------------------------------------------------------------------

-- Sessão de WhatsApp do usuário ---------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  phone_number    VARCHAR(32)  NOT NULL,
  display_name    VARCHAR(120),
  status          VARCHAR(16)  NOT NULL DEFAULT 'connected'
                  CHECK (status IN ('connected', 'disconnected')),
  connected_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_sessions (phone_number);

-- Conversa ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id               SERIAL PRIMARY KEY,
  owner_user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_phone    VARCHAR(32) NOT NULL,
  contact_name     VARCHAR(120),
  -- vínculo opcional com Cliente do CRM (match por telefone)
  client_id        INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  last_message_at  TIMESTAMP,
  unread_count     INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- garante uma conversa única por (dono, contato)
  UNIQUE (owner_user_id, contact_phone)
);

CREATE INDEX IF NOT EXISTS idx_conversations_owner ON conversations (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations (client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations (last_message_at DESC NULLS LAST);

-- Mensagens -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id                    SERIAL PRIMARY KEY,
  conversation_id       INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction             VARCHAR(8) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content               TEXT NOT NULL,
  media_url             TEXT,
  status                VARCHAR(16) NOT NULL DEFAULT 'sent'
                        CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'received')),
  -- id da mensagem no provedor real (quando integrar com Cloud API / Baileys / etc.)
  provider_message_id   VARCHAR(120),
  sent_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, sent_at);

-- Trigger genérico para manter updated_at
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_whatsapp_sessions_updated_at
  BEFORE UPDATE ON whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_updated_at();

CREATE TRIGGER trigger_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_updated_at();
