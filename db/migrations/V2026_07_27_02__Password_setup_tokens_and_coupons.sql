-- Camada A: password_setup_tokens — token de uso único enviado por email
-- pra novo user definir sua senha (onboarding manual) OU pra user existente
-- resetar senha esquecida.
--
-- Fluxo:
--   1. Admin cria novo cliente em /admin/accounts (sem informar senha)
--   2. Backend cria user com password_hash NULL, gera token, envia email
--   3. Cliente clica no link https://app.brm.tec.br/setup-password?token=xxx
--   4. Frontend valida token via GET /api/auth/validate-setup-token
--   5. Cliente define senha via POST /api/auth/setup-password
--   6. Token vira used=true; senha vira hash bcrypt; auto-login (JWT)

-- Torna password_hash nullable — user pode existir sem senha até definir
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE IF NOT EXISTS password_setup_tokens (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         VARCHAR(128) NOT NULL UNIQUE,
  -- 'setup' = primeiro acesso (user criado sem senha)
  -- 'reset' = user já tinha senha e esqueceu
  purpose       VARCHAR(16) NOT NULL DEFAULT 'setup'
                CHECK (purpose IN ('setup', 'reset')),
  expires_at    TIMESTAMP NOT NULL,
  used_at       TIMESTAMP,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_token
  ON password_setup_tokens(token) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_user
  ON password_setup_tokens(user_id);

-- Limpa tokens vencidos automaticamente via cron simples (24h).
-- Não é crítico — só evita bloat. Se tiver problema, ignoramos.

-- =============================================================================
-- Camada B: cupons de desconto para a LP
-- =============================================================================
--
-- Admin cria cupom via /admin/coupons. LP (pública, sem auth) valida o
-- código antes do pagamento em POST /api/checkout/validate-coupon.
--
-- Modelo escolhido: cupom aplica em TODAS as mensalidades enquanto assinatura
-- ativa (opção B do cliente). Concretamente: quando checkout roda no Stripe,
-- criamos uma subscription com discount permanente. Não modelamos "quantos
-- ciclos" — Stripe cuida disso, aqui só guardamos os metadados.

CREATE TABLE IF NOT EXISTS coupons (
  id                SERIAL PRIMARY KEY,
  code              VARCHAR(40) NOT NULL UNIQUE,
  description       TEXT,
  discount_type     VARCHAR(16) NOT NULL
                    CHECK (discount_type IN ('percent', 'fixed_brl')),
  -- Se percent: 10 = 10% off; se fixed_brl: 5000 = R$50,00 off (centavos)
  discount_value    INTEGER NOT NULL CHECK (discount_value > 0),
  -- Janela de validade. valid_until NULL = sem data limite.
  valid_from        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until       TIMESTAMP,
  -- Número máximo de vezes que o cupom pode ser usado. NULL = sem limite.
  max_uses          INTEGER,
  uses_count        INTEGER NOT NULL DEFAULT 0,
  -- Se informado, cupom só serve pra esse plano (basic/pro/enterprise).
  -- NULL = vale pra qualquer plano.
  plan_filter       VARCHAR(30),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupons_code_active
  ON coupons(code) WHERE is_active = true;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_coupons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_coupons_updated_at ON coupons;
CREATE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_coupons_updated_at();
