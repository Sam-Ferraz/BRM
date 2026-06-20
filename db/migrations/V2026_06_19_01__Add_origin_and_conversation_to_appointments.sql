-- Adiciona vínculo entre atendimentos e conversas do WhatsApp.
--
-- Regra de negócio: cada conversa do WhatsApp gera UM atendimento
-- (type='chat', origin='whatsapp') quando há interação bilateral
-- (recebimento + envio) dentro de uma janela de 24 horas. Mensagens
-- adicionais na mesma conversa dentro das 24h NÃO somam novo atendimento.
--
-- Campos novos:
--   • origin           — de onde o atendimento foi originado
--                        ('manual' = criado na tela, 'whatsapp' = bot da conversa)
--   • conversation_id  — quando origin='whatsapp', referencia a conversa
--                        que disparou a auto-criação.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS origin VARCHAR(20) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS conversation_id INTEGER NULL REFERENCES conversations(id) ON DELETE SET NULL;

-- Index para a query de dedupe das últimas 24h por conversa.
CREATE INDEX IF NOT EXISTS idx_appointments_conversation_recent
  ON appointments (conversation_id, scheduled_datetime DESC)
  WHERE conversation_id IS NOT NULL;

-- Index para filtros por origem no dashboard.
CREATE INDEX IF NOT EXISTS idx_appointments_origin
  ON appointments (origin);
