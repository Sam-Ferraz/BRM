-- V2026_07_10_01__Add_user_permission_overrides.sql
--
-- Overrides individuais por usuário sobre a matriz de permissões (roles).
--
-- Semântica de checagem:
--   1. Se existe user_permission_overrides pro (user_id, permission_id) → usa allowed
--   2. Senão → usa role_permissions do role do usuário
--   3. Senão → nega (false)
--   Admin sempre passa (bypass no service).
--
-- Idempotente: pode rodar múltiplas vezes sem quebrar.

CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id  INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  allowed        BOOLEAN NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     INTEGER REFERENCES users(id),
  CONSTRAINT user_permission_overrides_unique UNIQUE (user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user
  ON user_permission_overrides (user_id);
