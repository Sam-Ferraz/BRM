-- V2026_07_07_02__Create_user_management_and_permissions.sql
--
-- Módulo Usuários + Sistema de Permissões (RBAC editável).
--
-- 5 tipos de acesso:
--   • admin          — total (não editável na UI)
--   • manager        — gerente (aprova propostas, revisa contratos como gestor)
--   • broker         — corretor (dados próprios + upload docs no contrato)
--   • sdr            — pré-vendas (triagem de leads, agenda)
--   • administrative — administrativo/jurídico/financeiro
--                      (revisa contratos como jurídico, vê relatórios)
--
-- Matriz editável: tabela role_permissions (role × permission_key × allowed).
-- Admin sempre tem tudo — nem entra na matriz (checagem no service).

-- =============================================================================
-- Users: campos novos + CHECK constraint com os 5 roles
-- =============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Normaliza roles legadas ANTES de aplicar a CHECK constraint. Qualquer valor
-- fora da lista vai virar 'broker' (fallback seguro).
UPDATE users
   SET role = CASE
        WHEN role IN ('admin', 'manager', 'broker', 'sdr', 'administrative') THEN role
        WHEN role = 'user' THEN 'broker'
        ELSE 'broker'
      END
 WHERE role IS NULL
    OR role NOT IN ('admin', 'manager', 'broker', 'sdr', 'administrative');

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'manager', 'broker', 'sdr', 'administrative'));

CREATE INDEX IF NOT EXISTS idx_users_active_last_login
  ON users (active, last_login_at DESC NULLS LAST);

-- =============================================================================
-- Permissions: catálogo de rotinas disponíveis no sistema
-- =============================================================================

CREATE TABLE IF NOT EXISTS permissions (
  id           SERIAL PRIMARY KEY,
  key          VARCHAR(80) NOT NULL UNIQUE,   -- ex: 'deals.edit'
  module       VARCHAR(40) NOT NULL,          -- ex: 'deals'
  label        VARCHAR(120) NOT NULL,         -- ex: 'Editar negócios'
  description  TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions (module, display_order);

-- =============================================================================
-- Role Permissions: matriz roles × permissions com flag allowed
-- =============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id             SERIAL PRIMARY KEY,
  role           VARCHAR(20) NOT NULL,
  permission_id  INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  allowed        BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     INTEGER REFERENCES users(id),
  CONSTRAINT role_permissions_role_check
    CHECK (role IN ('admin', 'manager', 'broker', 'sdr', 'administrative')),
  CONSTRAINT role_permissions_unique
    UNIQUE (role, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions (role);

-- =============================================================================
-- Seed: 40 permissões cobrindo todos os módulos + defaults por role
-- =============================================================================

-- Permissões: (key, module, label, description, display_order)
INSERT INTO permissions (key, module, label, description, display_order) VALUES
  -- Módulo Usuários (admin only por padrão)
  ('users.view',            'users', 'Visualizar usuários',             'Ver lista de usuários cadastrados',                                10),
  ('users.create',          'users', 'Criar usuário',                    'Criar um novo usuário no sistema',                                 20),
  ('users.edit',            'users', 'Editar usuário',                   'Alterar nome, email e role de usuários existentes',                30),
  ('users.deactivate',      'users', 'Desativar usuário',                'Desativar um usuário (soft-delete — histórico permanece)',         40),
  ('users.reset_password',  'users', 'Resetar senha',                    'Definir nova senha pra um usuário',                                50),
  ('permissions.edit',      'users', 'Editar permissões',                'Alterar a matriz de permissões por role',                          60),

  -- Integrações (admin/manager)
  ('integrations.meta',     'integrations', 'Configurar Meta',           'Cadastrar/editar integração Meta Lead Ads',                        10),
  ('integrations.google',   'integrations', 'Conectar Google Calendar',  'Conectar a própria conta Google Calendar em /settings',           20),

  -- Leads
  ('leads.view_own',        'leads', 'Ver leads próprios',                'Ver leads atribuídos ao usuário',                                  10),
  ('leads.view_all',        'leads', 'Ver todos os leads',                'Ver leads de todos os corretores',                                 20),
  ('leads.accept',          'leads', 'Aceitar lead',                      'Aceitar lead e converter em negócio',                              30),
  ('leads.discard',         'leads', 'Descartar lead',                    'Marcar lead como descartado',                                      40),
  ('leads.sources.manage',  'leads', 'Configurar fontes',                 'Cadastrar/editar fontes de captação de leads',                     50),

  -- Deals / Negócios
  ('deals.view_own',        'deals', 'Ver negócios próprios',             'Ver os próprios negócios',                                         10),
  ('deals.view_all',        'deals', 'Ver todos os negócios',             'Ver negócios de todo o time',                                      20),
  ('deals.create',          'deals', 'Criar negócio',                     'Criar novo negócio',                                               30),
  ('deals.edit',            'deals', 'Editar negócio',                    'Editar dados do negócio',                                          40),
  ('deals.change_status',   'deals', 'Mover no Kanban',                   'Mudar status (fase) do negócio',                                   50),
  ('deals.delete',          'deals', 'Excluir negócio',                   'Remover negócio permanentemente',                                  60),

  -- Clientes
  ('clients.view_own',      'clients', 'Ver clientes próprios',           'Ver clientes vinculados aos próprios negócios',                    10),
  ('clients.view_all',      'clients', 'Ver todos os clientes',           'Ver clientes de todo o time',                                      20),
  ('clients.create',        'clients', 'Criar cliente',                   'Cadastrar novo cliente',                                           30),
  ('clients.edit',          'clients', 'Editar cliente',                  'Alterar dados do cliente',                                         40),
  ('clients.delete',        'clients', 'Excluir cliente',                 'Remover cliente',                                                  50),

  -- Imóveis / Products
  ('products.view',         'products', 'Ver catálogo',                    'Ver imóveis cadastrados',                                          10),
  ('products.create',       'products', 'Cadastrar imóvel',                'Cadastrar novo imóvel',                                            20),
  ('products.edit',         'products', 'Editar imóvel',                   'Alterar dados do imóvel',                                          30),
  ('products.delete',       'products', 'Excluir imóvel',                  'Remover imóvel',                                                   40),
  ('products.showcase',     'products', 'Gerenciar vitrine',               'Ativar/desativar imóveis na vitrine',                              50),

  -- Atendimentos
  ('appointments.view_own', 'appointments', 'Ver atendimentos próprios',   'Ver próprios atendimentos',                                        10),
  ('appointments.view_all', 'appointments', 'Ver atendimentos do time',    'Ver atendimentos de todos os corretores',                          20),
  ('appointments.create',   'appointments', 'Criar atendimento',           'Registrar novo atendimento',                                       30),
  ('appointments.edit',     'appointments', 'Editar atendimento',          'Alterar dados de atendimento',                                     40),

  -- Follow-ups
  ('followups.view_own',    'followups', 'Ver follow-ups próprios',        'Ver próprios follow-ups',                                          10),
  ('followups.view_all',    'followups', 'Ver follow-ups do time',         'Ver follow-ups de todos os corretores',                            20),
  ('followups.create',      'followups', 'Criar follow-up',                'Agendar novo follow-up',                                           30),
  ('followups.complete',    'followups', 'Concluir follow-up',             'Marcar follow-up como concluído',                                  40),

  -- Propostas
  ('proposals.view_own',    'proposals', 'Ver propostas próprias',         'Ver propostas dos próprios negócios',                              10),
  ('proposals.view_all',    'proposals', 'Ver todas as propostas',         'Ver propostas de todo o time',                                     20),
  ('proposals.create',      'proposals', 'Criar proposta',                 'Emitir nova proposta',                                             30),
  ('proposals.edit',        'proposals', 'Editar proposta',                'Alterar valor / condições da proposta',                            40),
  ('proposals.approve',     'proposals', 'Aprovar proposta',               'Aprovar/rejeitar propostas (dispara módulo Contrato)',             50),

  -- Contratos
  ('contracts.view_own',        'contracts', 'Ver contratos próprios',     'Ver contratos dos próprios negócios',                              10),
  ('contracts.view_all',        'contracts', 'Ver todos os contratos',     'Ver contratos de todo o time',                                     20),
  ('contracts.upload_docs',     'contracts', 'Anexar documentos',          'Corretor: anexar documentos do cliente',                           30),
  ('contracts.legal_review',    'contracts', 'Revisar (Jurídico)',         'Jurídico: aprovar/rejeitar + anexar contrato final',              40),
  ('contracts.manager_approve', 'contracts', 'Aprovar (Gestor)',           'Gestor: aprovar contrato → cria a Venda',                          50),

  -- Vendas
  ('sales.view',            'sales', 'Ver vendas',                          'Ver vendas fechadas',                                              10),
  ('sales.edit',            'sales', 'Editar venda',                        'Alterar dados de venda (data, contrato)',                          20),

  -- Chat / WhatsApp
  ('chat.view_own',         'chat', 'Ver conversas próprias',              'Ver conversas atribuídas',                                         10),
  ('chat.view_all',         'chat', 'Ver todas as conversas',              'Ver conversas de todo o time',                                     20),
  ('chat.send',             'chat', 'Enviar mensagens',                    'Enviar mensagens via WhatsApp',                                    30),

  -- Agenda
  ('agenda.view_own',       'agenda', 'Ver agenda própria',                 'Ver própria agenda unificada',                                     10),
  ('agenda.view_team',      'agenda', 'Ver agenda do time',                 'Toggle "Ver time" na agenda (compromissos de todos)',              20),
  ('agenda.create_event',   'agenda', 'Criar compromisso',                  'Criar evento manual na agenda',                                    30),

  -- Analytics
  ('analytics.view',        'analytics', 'Ver análises',                   'Ver relatórios de funil, propostas, apresentações',                10)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- Defaults: role_permissions inicial com as flags por role
-- =============================================================================
--
-- Admin não entra na matriz — a checagem de permissão é bypass'ada quando
-- role='admin' no service (ele sempre pode tudo).
--
-- Estratégia: pra cada role (exceto admin), inserimos uma linha por permission
-- com o allowed default. Se já existir (rerun da migration), não sobrescreve.

-- MANAGER: gerente vê tudo do time + aprova propostas + aprova contratos como gestor
INSERT INTO role_permissions (role, permission_id, allowed)
SELECT 'manager', p.id, TRUE
FROM permissions p
WHERE p.key IN (
  'integrations.google',
  'leads.view_own', 'leads.view_all', 'leads.accept', 'leads.discard', 'leads.sources.manage',
  'deals.view_own', 'deals.view_all', 'deals.create', 'deals.edit', 'deals.change_status',
  'clients.view_own', 'clients.view_all', 'clients.create', 'clients.edit',
  'products.view', 'products.create', 'products.edit', 'products.showcase',
  'appointments.view_own', 'appointments.view_all', 'appointments.create', 'appointments.edit',
  'followups.view_own', 'followups.view_all', 'followups.create', 'followups.complete',
  'proposals.view_own', 'proposals.view_all', 'proposals.create', 'proposals.edit', 'proposals.approve',
  'contracts.view_own', 'contracts.view_all', 'contracts.manager_approve',
  'sales.view', 'sales.edit',
  'chat.view_own', 'chat.view_all', 'chat.send',
  'agenda.view_own', 'agenda.view_team', 'agenda.create_event',
  'analytics.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- BROKER: corretor — só próprios + upload docs de contrato
INSERT INTO role_permissions (role, permission_id, allowed)
SELECT 'broker', p.id, TRUE
FROM permissions p
WHERE p.key IN (
  'integrations.google',
  'leads.view_own', 'leads.accept', 'leads.discard',
  'deals.view_own', 'deals.create', 'deals.edit', 'deals.change_status',
  'clients.view_own', 'clients.create', 'clients.edit',
  'products.view',
  'appointments.view_own', 'appointments.create', 'appointments.edit',
  'followups.view_own', 'followups.create', 'followups.complete',
  'proposals.view_own', 'proposals.create', 'proposals.edit',
  'contracts.view_own', 'contracts.upload_docs',
  'sales.view',
  'chat.view_own', 'chat.send',
  'agenda.view_own', 'agenda.create_event'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- SDR: pré-vendas — foco em leads e agenda
INSERT INTO role_permissions (role, permission_id, allowed)
SELECT 'sdr', p.id, TRUE
FROM permissions p
WHERE p.key IN (
  'integrations.google',
  'leads.view_own', 'leads.view_all', 'leads.accept', 'leads.discard',
  'deals.view_own', 'deals.create', 'deals.edit', 'deals.change_status',
  'clients.view_own', 'clients.create', 'clients.edit',
  'products.view',
  'appointments.view_own', 'appointments.create', 'appointments.edit',
  'followups.view_own', 'followups.create', 'followups.complete',
  'chat.view_own', 'chat.send',
  'agenda.view_own', 'agenda.create_event',
  'analytics.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ADMINISTRATIVE: administrativo/jurídico/financeiro — revisa contratos como jurídico
INSERT INTO role_permissions (role, permission_id, allowed)
SELECT 'administrative', p.id, TRUE
FROM permissions p
WHERE p.key IN (
  'integrations.google',
  'deals.view_all',
  'clients.view_all',
  'products.view',
  'appointments.view_all',
  'proposals.view_all',
  'contracts.view_all', 'contracts.legal_review',
  'sales.view', 'sales.edit',
  'agenda.view_own', 'agenda.view_team',
  'analytics.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Trigger de updated_at pra role_permissions (útil pra auditoria)
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON role_permissions
FOR EACH ROW
EXECUTE FUNCTION update_chat_updated_at();
