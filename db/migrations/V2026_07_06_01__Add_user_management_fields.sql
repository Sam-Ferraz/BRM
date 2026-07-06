-- V2026_07_06_01__Add_user_management_fields.sql
--
-- Habilita o módulo de gestão de usuários (CRUD via UI + escopos por role).
--
-- Antes: users.role era string livre ('admin', 'user'). Agora, 3 valores fixos:
--   • admin   — total (gerencia usuários e integrações)
--   • manager — vê time inteiro (leads/deals/atendimentos de todos os corretores)
--   • broker  — corretor, só os próprios dados
--
-- Também adiciona:
--   • active            — soft delete (usuário desativado não loga, mas histórico fica)
--   • last_login_at     — pra ordenar por atividade recente na tela de admin
--
-- Estratégia de migração de dados existentes:
--   • quem tinha role='admin' fica 'admin'
--   • quem tinha role='user' vira 'broker'
--   • qualquer outro valor legado vira 'broker' pra não quebrar auth
--   • Só depois de normalizar aplica a CHECK constraint

-- 1. Adiciona colunas novas com defaults seguros
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 2. Normaliza roles existentes pros 3 valores oficiais
UPDATE users
   SET role = 'broker'
 WHERE role IS NULL
    OR role NOT IN ('admin', 'manager', 'broker');

-- 3. Constraint de valores válidos — só depois de normalizar
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'manager', 'broker'));

-- 4. Índice pra listagem ordenada por último acesso (pequeno mas ajuda com muitos users)
CREATE INDEX IF NOT EXISTS idx_users_active_last_login
  ON users (active, last_login_at DESC NULLS LAST);
