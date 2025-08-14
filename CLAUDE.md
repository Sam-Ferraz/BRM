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

# Testing with Puppeteer (development only)
node dev-tools/test-browser.js

# Start Puppeteer MCP server (for Claude Code integration)
node dev-tools/puppeteer-mcp/server.js
```

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
- `src/lib/datetime.ts` - Date/time formatting utilities with Sao Paulo timezone support
- `src/pages/LoginPage.tsx` - Login page with improved UX (password toggle, auto-focus, validation)
- `src/pages/DashboardPage.tsx` - Main dashboard with navigation and charts
- `src/pages/ConfigPage.tsx` - Settings page with theme and language selection
- `src/contexts/AuthContext.tsx` - Authentication context with JWT handling
- `src/components/forms/` - Reusable CRUD form components
- `src/components/language-selector.tsx` - Language switching component
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
- **Date Formatting**: Uses date-fns with Brazil locale and Sao Paulo timezone (dd/MM/yyyy format)

**Backend:**
- **Database**: PostgreSQL with connection pooling
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