-- Adiciona campos para integração com WhatsApp Cloud API (oficial da Meta).
--
-- Modelo BYOK (Bring Your Own Keys): cada usuário do BRM cria sua própria
-- WABA (WhatsApp Business Account) na Meta Business Manager, gera o
-- Phone Number ID + Access Token + App Secret, e cola na UI do BRM.
-- O backend chama a Graph API usando essas credenciais.
--
-- Os campos novos não são obrigatórios pra manter retrocompatibilidade
-- com Baileys (até a migração ser completa). Quando todos os usuários
-- migrarem, podemos torná-los NOT NULL em migration futura.
--
-- Campos:
--   • provider            — 'baileys' (legado) ou 'cloud_api' (novo)
--   • phone_number_id     — ID do número na Meta (numérico, 15+ dígitos)
--   • access_token        — Token de longa duração da WABA (60 dias ou permanente
--                            via System User). É criptografável depois.
--   • app_secret          — Segredo do App Meta, usado pra validar assinatura
--                            do webhook (X-Hub-Signature-256)
--   • verify_token        — Token de verificação que o user define ao configurar
--                            o webhook na Meta — o BRM valida na challenge inicial
--   • business_account_id — ID da WABA (útil pra requisições de templates)

ALTER TABLE whatsapp_sessions
  ADD COLUMN IF NOT EXISTS provider             VARCHAR(20)  NOT NULL DEFAULT 'baileys',
  ADD COLUMN IF NOT EXISTS phone_number_id      VARCHAR(64)  NULL,
  ADD COLUMN IF NOT EXISTS access_token         TEXT         NULL,
  ADD COLUMN IF NOT EXISTS app_secret           TEXT         NULL,
  ADD COLUMN IF NOT EXISTS verify_token         VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS business_account_id  VARCHAR(64)  NULL;

-- Permite mais valores em status pra refletir estados do Cloud API
ALTER TABLE whatsapp_sessions DROP CONSTRAINT IF EXISTS whatsapp_sessions_status_check;
ALTER TABLE whatsapp_sessions ADD CONSTRAINT whatsapp_sessions_status_check
  CHECK (status IN ('connected', 'disconnected', 'pending_setup', 'invalid_credentials'));

-- Índice pra lookup rápido por phone_number_id (vai ser usado no webhook
-- pra rotear a mensagem entrante pro usuário correto).
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone_number_id
  ON whatsapp_sessions (phone_number_id)
  WHERE phone_number_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_provider ON whatsapp_sessions (provider);
