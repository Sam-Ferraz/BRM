# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚙️ Fluxo de Trabalho (IMPORTANTE)

**O usuário NÃO quer parar para commitar/pushar.** O fluxo é:

1. Claude edita o código
2. Claude AUTOMATICAMENTE roda `git add + commit + push origin trunk` ao final de cada mudança substantiva (1 feature = 1 commit)
3. GitHub Actions auto-deploya em https://test.brm.tec.br (staging)
4. Usuário testa em staging e decide:
   - ✅ Aprovado → vai em Actions → "Deploy to Production" → digita `deploy`
   - ❌ Rejeitado → pede ajuste, Claude reedita e o ciclo repete

**Regras de commit automático:**
- Mensagem em PT-BR, descritiva (não só "fix bug"). Padrão Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `style:`, `test:`, `ci:`
- Sempre incluir `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` no rodapé
- Stage apenas arquivos relacionados à mudança (evita `git add .`)
- 1 mudança lógica = 1 commit (NÃO juntar features diferentes)
- Push imediato após o commit (sem esperar acumular)

**Quando NÃO commitar automaticamente:**
- Edições só de teste/exploração que o usuário pediu pra testar antes
- Edições em arquivos sensíveis (`.env`, `auth/`, credenciais)
- Quando o usuário disse "não comita ainda"

**Após commitar:** avisar brevemente o usuário "Deploy em staging iniciado, testa em ~2 min em https://test.brm.tec.br"

---

## Objetivo do Sistema

**BRM — Business Relationship Management (Imobiliário)**

Software de **Gestão de Negócios Imobiliários** com foco em inteligência para tomada de decisão, integrando quatro pilares: **Negócio, Cliente, Atendimento e Produto (Imóvel)**.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + TypeScript + Vite |
| UI | shadcn/ui + TailwindCSS + Recharts |
| i18n | react-i18next (PT, EN, ES) |
| Backend | Node.js + TypeScript + Express |
| Banco | PostgreSQL (porta 5523 local) |
| Auth | JWT + bcrypt |
| Migrations | Flyway (via Docker) ou psql manual |
| Upload | S3 (imagens de imóveis) |
| Infra | AWS CloudFormation |
| Testes | Jest (backend) + Puppeteer (browser, dev) |

---

## Arquitetura do Backend

Padrão em camadas com injeção de dependência:

- `server/repositories/` — acesso ao banco (estende `BaseRepository`)
- `server/services/` — regras de negócio
- `server/routes/` — handlers HTTP
- `server/types/index.ts` — interfaces TypeScript
- `server/middleware/` — auth, upload, etc.
- `server/__tests__/` — testes Jest com repositórios mockados
- `server/database.ts` — pool PostgreSQL

Fluxo: **Route → Service → Repository → DB**. Serviços recebem repositórios via DI, o que permite mockar nos testes unitários.

---

## Módulos do Sistema

| Módulo | Rota Frontend | API | Descrição |
|--------|--------------|-----|-----------|
| Dashboard | `/dashboard` | (agrega) | Visão geral com contadores e gráficos |
| Negócios | `/negocios` | `/api/deals` | Gestão de deals imobiliários |
| Clientes | `/clientes` | `/api/clients` | Cadastro de clientes |
| Atendimentos | `/atendimentos` | `/api/appointments` | Tickets de serviço/visita |
| Imóveis | `/produtos` | `/api/products` | Catálogo de imóveis com fotos |
| Vitrine | `/sales-agenda` | `/api/products` (consome o catálogo de imóveis) | Vitrine visual dos imóveis cadastrados |
| Follow-ups | `/follow-ups` | — | Acompanhamentos |
| Analytics | `/analytics` | — | Análises avançadas |
| Configurações | `/configuracoes` | — | Tema, idioma, fuso horário |

### Rotas de autenticação

- `POST /api/auth/login` — login
- `POST /api/auth/register` — cadastro
- `GET  /api/auth/verify` — verificação de token
- `POST /api/auth/logout` — logout

---

## Ambiente Local

```text
# PostgreSQL
Host:    localhost
Porta:   5523
Banco:   brm
Usuário: postgres
Senha:   superdev

# Backend
Porta:   3001
Comando: npm run server:dev   (Terminal 1)

# Frontend
Porta:   5173
Comando: npm run dev          (Terminal 2)
```

### PostgreSQL — iniciar se cair

```bat
pg_ctl start -D "C:\Program Files\PostgreSQL\18\data"
```

Garantir que o `psql`/`pg_ctl` estão no PATH:

```bat
:: CMD
set PATH=%PATH%;C:\Program Files\PostgreSQL\18\bin
```

```powershell
# PowerShell
$env:PATH += ";C:\Program Files\PostgreSQL\18\bin"
```

---

## Credenciais de Desenvolvimento

- **Email**: `admin@brm.com`
- **Senha**: `admin123`

Para uso apenas em ambiente local. Variáveis também disponíveis no `.env` como `DEV_USER` / `DEV_PASSWORD`.

---

## Repositório GitHub

- **URL**: https://github.com/Sam-Ferraz/BRM
- **Branch principal**: `trunk`
- **Commit & push**:
  ```bash
  git add .
  git commit -m "mensagem"
  git push origin trunk
  ```

---

## Comandos de Desenvolvimento

```bash
# Frontend
npm run dev                  # dev server (Vite)
npm run build                # build produção
npm run preview              # preview do build
npm run lint                 # lint

# Backend
npm run server               # produção
npm run server:dev           # dev com watch
npm run server:build         # compila TypeScript
npm run server:clean         # limpa artefatos

# Testes backend
npm run server:test
npm run server:test:watch
npm run server:test:coverage

# Banco de dados
npm run schema:dump          # gera db/schema/current-schema.sql
npm run migrate              # aplica migrations pendentes
npm run migrate:info         # status das migrations
npm run migrate:validate     # valida arquivos
npm run migrate:baseline     # baseline (primeira vez)
npm run migrate:setup        # baseline + info
npm run migrate:clean        # LIMPA BANCO (dev only — DESTRUTIVO)

# Browser testing (Puppeteer)
node dev-tools/test-browser.js
node dev-tools/puppeteer-mcp/server.js
```

> **Sempre fazer `npm run server:build` após alterar arquivos TypeScript do backend.**

---

## Entidades

### Deal (Negócio)

Campos: `id`, `client`, `value`, `status`, `date`, `description`.

**Status (campo único — sem temperatura separada)**:

- Atendimento: `service_cold`, `service_mild`, `service_warm`
- Visita prevista: `visit_foreseen_cold`, `visit_foreseen_mild`, `visit_foreseen_warm`
- Visita realizada: `visit_done_cold`, `visit_done_mild`, `visit_done_warm`
- Proposta: `proposal`
- Vendido: `sold`
- Descartado: `discarded_no_profile`, `discarded_no_interest`, `discarded_competitor`, `discarded_error`

### Product (Imóvel)

- **Nome**, **Preço**
- **Tipo**: Apartamento / Casa / Cobertura / Terreno / Estúdio / Flat / Empreendimento
- **Categoria**: off-plan / pronto
- **Data de Captação**, **Captador** (select de usuários)
- **Condição de Pagamento**
- **Aceita permuta automóvel** (S/N), **Aceita permuta imóvel** (S/N)
- **Quartos**, **Suítes**, **Vagas**, **Banheiros**
- **Área Total**, **Área Privativa**, **Condomínio**
- **Endereço**, **Bairro**, **Município**, **Estado**, **País**
- **Disponível para venda** (S/N)
- **Descrição**
- **Fotos** (até 10, armazenadas em S3)

### Client (Cliente)

`id`, `name`, `email`, `phone`, `city`, `address`, `company`.

### Appointment (Atendimento)

`id`, `client`, `type` ("Suporte"|"Vendas"|"Consultoria"), `status`, `scheduled_datetime`, `description`.

### SalesAgenda (tabela legada — não exposta como módulo; Vitrine consome `products`)

`id`, `title`, `client`, `value`, `date`, `status` ("Ativa"|"Concluída"|"Cancelada").

---

## Arquivos Principais

| Arquivo | Localização |
|---------|------------|
| Rotas frontend | `src/App.tsx` |
| Traduções (i18n) | `src/lib/i18n.ts` |
| API client | `src/lib/api-client.ts` |
| Utilitários de data | `src/lib/datetime.ts` |
| Formulário negócio | `src/components/forms/deal-form.tsx` |
| Formulário imóvel | `src/components/forms/product-form.tsx` |
| Formulário cliente | `src/components/forms/client-form.tsx` |
| Auth context | `src/contexts/AuthContext.tsx` |
| Login page | `src/pages/LoginPage.tsx` |
| Dashboard page | `src/pages/DashboardPage.tsx` |
| Config page | `src/pages/ConfigPage.tsx` |
| Servidor principal | `server/index.ts` |
| Types backend | `server/types/index.ts` |
| Banco de dados | `server/database.ts` |
| Auth service | `server/services/auth-service.ts` |
| Migrations | `db/migrations/` |
| Schema atual | `db/schema/current-schema.sql` |

### Dev tools

- `dev-tools/test-browser.js` — script Puppeteer
- `dev-tools/puppeteer-mcp/server.js` — MCP server para browser
- `dev-tools/screenshots/` — screenshots gerados nos testes

---

## Convenções do Projeto

- **Inglês** para variáveis, nomes de arquivo, colunas e tabelas
- **Português** no frontend (idioma padrão PT-BR)
- Arquitetura **Repository → Service → Route**
- Sempre rodar `npm run server:build` após alterar TypeScript do backend
- Migrations: `V{ANO}_{MES}_{DIA}_{SEQ}__{Descricao}.sql` (ex: `V2026_04_17_01__Add_property_fields_to_products.sql`)
- **Nunca modificar migrations já aplicadas** — criar uma nova
- Path alias: `@/` → `src/`
- Diálogos modais para formulários CRUD, com loading states e validação
- Rotas frontend protegidas via `AuthContext` + `localStorage`
- Date-fns com locale BR (dd/MM/yyyy), timezone selecionável pelo usuário (default: São Paulo)

---

## Fluxo de Autenticação

1. Usuário entra em `/` (login)
2. Frontend valida email e campos obrigatórios
3. `POST /api/auth/login` com credenciais
4. Backend:
   - `auth-routes.ts` recebe a requisição
   - Chama `AuthService.loginUser()`
   - `AuthService` usa `UserRepository.findByEmail()`
   - bcrypt verifica a senha
   - JWT é gerado se OK
5. Token retornado ao frontend, salvo em `localStorage`
6. `AuthContext` mantém o estado
7. Rotas protegidas verificam o token; verificação automática ocorre na inicialização

---

## Migrations (Flyway)

- **Schema history**: tabela `flyway_schema_history` (auto)
- **Config**: `flyway.conf` com placeholders de env vars
- **Localização**: `db/migrations/`
- **Naming**: `V{ANO}_{MES}_{DIA}_{SEQ}__{Descricao}.sql` (recomendado para times)
- **Workflow**:
  - Dev: `npm run migrate:info` → `npm run migrate`
  - Produção: GitHub Actions aplica automaticamente em pushes na branch `trunk`
  - Validação: rodar `npm run migrate:validate` antes de commitar
- **Regras**:
  - Nunca modificar migrations já aplicadas
  - Para remover coluna em uso: primeiro adicionar a nova, atualizar o código, depois (em migration futura) remover a antiga
  - Baseline está na versão 1 — schema existente é preservado

---

## Testing

- **Backend**: Jest com repositórios mockados (`server/__tests__/services/`)
  - Foco em regras de negócio, não em integração de banco
- **Browser**: Puppeteer + MCP server (`dev-tools/`)
  - Login, formulários, design responsivo (desktop + mobile)
  - Screenshots gerados automaticamente

---

## Pending / Próximas melhorias

- Status dos negócios na lista de **Negócios sem Follow-up** mostrando valores internos (ex: `service_warm`) — precisa aplicar tradução i18n
- Coluna `propertyName` na lista de **Negócios sem Follow-up** precisa tradução
- Testes unitários desatualizados após refatoração de deals
- Script de inicialização automática (`.bat` / `.sh`) para subir todos os servidores de uma vez (já existem `start-brm.bat` / `stop-brm.bat` no diretório — verificar se atendem)

---

## Notas Técnicas

### Frontend

- TypeScript com config relaxado para iteração rápida
- Vite (build + HMR)
- React Router com rotas protegidas
- Recharts para gráficos do dashboard
- Tema light com gradiente azul/índigo
- Atalhos de teclado (a-e) para navegação entre módulos no dashboard

### Backend

- TypeScript estrito + ES modules
- PostgreSQL com pool de conexões e suporte a transações (`BaseRepository`)
- JWT com expiração configurável
- bcrypt para hashing
- CORS configurável
- Tratamento centralizado de erros nos handlers de rota
- Build: TS → JS com source maps

### Documentação

- **Atualize este `CLAUDE.md`** sempre que aprender um novo padrão, ferramenta ou detalhe de implementação que vá acelerar trabalhos futuros ou reduzir consumo de tokens
