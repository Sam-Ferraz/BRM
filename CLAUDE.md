# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Business Relationship Management (BRM)** system - a comprehensive CRM application built with **Vite + React**. It manages customers, deals, products, service tickets, and sales agendas with a modern React/TypeScript stack.

**Architecture**: Vite + React frontend with Node.js/Express backend, PostgreSQL database, JWT authentication, shadcn/ui components, TailwindCSS styling.

## Development Commands

```bash
# Development server
npm run dev

# Build for production  
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Database migrations (Flyway)
npm run migrate              # Run pending migrations
npm run migrate:info         # Show migration status
npm run migrate:validate     # Validate migration files  
npm run migrate:baseline     # Create baseline (first time setup)
npm run migrate:setup        # Complete setup (baseline + info)
npm run migrate:clean        # Clean database (dev only - DESTRUCTIVE)

# Testing with Puppeteer (development only)
node dev-tools/test-browser.js

# Start Puppeteer MCP server (for Claude Code integration)
node dev-tools/puppeteer-mcp/server.js
```

## Development Credentials

For local development and testing, use the credentials configured in `.env`.
These credentials are defined in the `.env` file as `DEV_USER` and `DEV_PASSWORD`.
Do not commit those credentials anywhere. Just use it on dev testing.

## Key Architecture Patterns

### Data Layer
- **Backend API**: Express.js server with PostgreSQL database (`server/` directory)
- **Authentication**: JWT-based auth with bcrypt password hashing (`server/auth.js`)
- **Database**: PostgreSQL with connection pooling (`server/database.js`)
- **API Endpoints**: RESTful APIs for all entities (`server/api-routes.js`)
- **Frontend API**: Client-side API wrapper in `src/lib/api.ts` (if exists) for frontend data operations
- **Entities**: Negocio (deals), Cliente (customers), Atendimento (service tickets), Produto (products), PautaVenda (sales agenda), Users

### UI Architecture  
- **React Router**: Pages in `src/pages/` directory with React Router navigation
- **Forms**: Reusable form components in `src/components/forms/` using Dialog pattern
- **UI Components**: shadcn/ui components in `src/components/ui/`
- **Styling**: TailwindCSS with responsive design patterns
- **I18n**: React i18next for internationalization (Portuguese, English, Spanish)

### Component Patterns
- **Page Structure**: Login → Dashboard → Entity pages (with CRUD operations)
- **Form Pattern**: Dialog-based forms with loading states and validation
- **Table Pattern**: Data tables with search, filtering, sorting, and pagination
- **Navigation**: Dashboard-centric with module navigation using React Router Link
- **Settings**: Config page (`/configuracoes`) with theme toggle and language selector

### Available Routes
**Frontend Routes:**
- `/` - Login page (with language selector, password visibility toggle, auto-focus)
- `/register` - User registration page
- `/forgot-password` - Password reset page
- `/dashboard` - Main dashboard (protected)
- `/negocios` - Deals management (protected)
- `/clientes` - Clients management (protected)
- `/atendimentos` - Services management (protected)
- `/produtos` - Products management (protected)
- `/pauta-vendas` - Sales agenda management (protected)
- `/configuracoes` - Settings/config page (protected)

**Backend API Routes:**
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Token verification
- `POST /api/auth/logout` - User logout
- RESTful endpoints for all entities (protected by JWT)

## Key Files

**Frontend:**
- `src/lib/i18n.ts` - Internationalization configuration and translations
- `src/lib/datetime.ts` - Date/time formatting utilities with user-selectable timezone support
- `src/pages/LoginPage.tsx` - Login page with improved UX (password toggle, auto-focus, validation)
- `src/pages/DashboardPage.tsx` - Main dashboard with navigation and charts
- `src/pages/ConfigPage.tsx` - Settings page with theme, language, and timezone selection
- `src/contexts/AuthContext.tsx` - Authentication context with JWT handling
- `src/components/forms/` - Reusable CRUD form components
- `src/components/language-selector.tsx` - Language switching component
- `src/components/timezone-selector.tsx` - Timezone selection component
- `src/components/reactive-datetime.tsx` - Reactive datetime component that updates with timezone changes
- `src/hooks/use-timezone.ts` - React hook for timezone state management
- `src/App.tsx` - Main App component with React Router setup and protected routes
- `vite.config.ts` - Vite configuration with path aliases

**Backend:**
- `server/index.js` - Express server setup and route definitions
- `server/auth.js` - JWT authentication logic with bcrypt
- `server/database.js` - PostgreSQL connection and database utilities
- `server/api-routes.js` - RESTful API endpoints for business entities

**Development Tools:**
- `dev-tools/test-browser.js` - Puppeteer browser automation test script
- `dev-tools/puppeteer-mcp/server.js` - MCP server for headless browser integration
- `dev-tools/screenshots/` - Generated browser test screenshots

## Entity Schemas

**Negocio (Deal)**: id, cliente, valor, status ("Em Andamento"|"Proposta"|"Fechado"), data, descricao  
**Cliente (Customer)**: id, nome, email, telefone, cidade, endereco, empresa  
**Atendimento (Service)**: id, cliente, tipo ("Suporte"|"Vendas"|"Consultoria"), status, data, hora, descricao  
**Produto (Product)**: id, nome, preco, categoria, estoque, descricao  
**PautaVenda (Sales Agenda)**: id, titulo, cliente, valor, data, status ("Ativa"|"Concluída"|"Cancelada")

## UI/UX Patterns

- **Responsive Design**: Mobile-first with grid layouts
- **Theme**: Light theme with blue/indigo gradient accents  
- **Charts**: Recharts integration for dashboard analytics
- **Forms**: Dialog modals with proper validation and loading states
- **Navigation**: Badge-based shortcuts (a-e keys) for modules, React Router navigation

## Technical Notes

**Frontend:**
- **TypeScript**: Configured with relaxed settings for faster development
- **Path Aliases**: `@/` maps to `src/` for clean imports
- **Build**: Uses Vite for fast builds and HMR development
- **Authentication**: Context-based with localStorage persistence and automatic token verification
- **Routing**: Protected routes with automatic redirect to login
- **Date Formatting**: Uses date-fns with Brazil locale (dd/MM/yyyy format)
- **Timezone Support**: User-selectable timezone in configuration page, defaults to São Paulo, persisted in localStorage

**Backend:**
- **Database**: PostgreSQL with connection pooling
- **Database Migrations**: Flyway with Docker integration for schema versioning
- **Authentication**: JWT tokens with configurable expiration
- **Security**: bcrypt password hashing, CORS configuration
- **Environment**: Configurable via environment variables
- **API**: RESTful design with proper error handling

**Development & Testing:**
- **Puppeteer**: Headless browser automation for UI testing (devDependencies only)
- **MCP Integration**: Model Context Protocol server for browser automation
- **Browser Testing**: Automated login, form, and responsive design tests
- **Screenshots**: Automated visual testing with desktop/mobile viewports

## Authentication Flow

1. User enters credentials on `/` (login page)
2. Frontend validates email format and required fields
3. POST request to `/api/auth/login` with credentials
4. Backend verifies credentials against PostgreSQL users table
5. On success: JWT token generated and returned with user data
6. Frontend stores token in localStorage and sets auth context
7. Protected routes check authentication status via context
8. Token verification happens on app initialization and API calls

## Database Migrations

The project uses **Flyway** for database schema management with Docker integration.

### Migration Setup
- **Schema History**: Managed by `flyway_schema_history` table (auto-created)
- **Configuration**: `flyway.conf` file with environment variable placeholders
- **Migration Files**: Located in `db/migrations/` with naming convention `V{version}__{description}.sql`
- **Supported Naming**: Both simple (`V1__Initial.sql`) and date-based (`V2025_08_14_01__Add_feature.sql`) formats

### Creating Migrations
1. **Create migration file** in `db/migrations/`:
   ```sql
   -- V2025_08_14_01__Add_user_table.sql
   CREATE TABLE new_table (
       id SERIAL PRIMARY KEY,
       name VARCHAR(255) NOT NULL
   );
   ```

2. **Run migration**:
   ```bash
   npm run migrate
   ```

### Migration Workflow
- **Development**: Use `npm run migrate:info` to check status, `npm run migrate` to apply
- **Production**: GitHub Actions automatically validates and applies migrations on deployment
- **Rollbacks**: Supported through Flyway's undo migrations or manual intervention

### GitHub Actions Integration
- **Validation**: Tests migrations against PostgreSQL service on pull requests
- **Deployment**: Auto-applies migrations to production database on main/trunk branch pushes
- **Environment**: Uses GitHub secrets for production database credentials

### Important Notes
- **Never modify applied migrations** - create new ones instead
- **Use date-based versioning** for team environments: `V2025_08_14_01__description.sql`
- **Test migrations locally** before committing using `npm run migrate:validate`
- **Baseline is set at version 1** - existing schema is preserved