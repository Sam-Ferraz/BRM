# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Business Relationship Management (BRM)** system - a comprehensive CRM application built with **Vite + React**. It manages customers, deals, products, service tickets, and sales agendas with a modern React/TypeScript stack.

**Architecture**: Vite + React frontend with TypeScript Node.js/Express backend, PostgreSQL database, JWT authentication, shadcn/ui components, TailwindCSS styling. Backend follows layered architecture with Repository/Service/Route pattern and comprehensive testing.

## Development Commands

```bash
# Frontend development server
npm run dev

# Backend server (production mode)
npm run server

# Backend server (development mode with watch)
npm run server:dev

# Build TypeScript backend
npm run server:build

# Clean backend build artifacts
npm run server:clean

# Backend testing
npm run server:test           # Run tests
npm run server:test:watch     # Run tests in watch mode
npm run server:test:coverage  # Run tests with coverage

# Start both servers (recommended for development)
# Terminal 1: npm run server:dev
# Terminal 2: npm run dev

# Build for production  
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Database operations
npm run schema:dump          # Generate current database schema
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

### Data Layer (TypeScript Backend)
- **Backend API**: TypeScript Express.js server with PostgreSQL database (`server/` directory)
- **Repository Layer**: Data access layer with dedicated repository classes (`server/repositories/`)
  - `BaseRepository` - Abstract base with connection management and transactions
  - `UserRepository`, `DealRepository`, `ClientRepository`, `ProductRepository`, `AppointmentRepository`, `SalesAgendaRepository`
- **Service Layer**: Business logic layer with dependency injection (`server/services/`)
  - `AuthService`, `DashboardService`, `DealService`, `ClientService`, `ProductService`, `AppointmentService`, `SalesAgendaService`
- **Route Layer**: Clean route handlers with TypeScript types (`server/routes/`)
- **Authentication**: JWT-based auth with bcrypt password hashing (`server/services/auth-service.ts`)
- **Database**: PostgreSQL with connection pooling (`server/database.ts`)
- **Testing**: Jest with mocked repositories for business logic testing (`server/__tests__/`)
- **Frontend API**: Client-side API wrapper in `src/lib/api-client.ts` for frontend data operations
- **Entities**: Deal (deals), Client (customers), Appointment (service tickets), Product (products), SalesAgenda (sales agenda), Users

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
- `GET/POST/PUT/DELETE /api/deals` - Deal management endpoints
- `GET/POST/PUT/DELETE /api/clients` - Client management endpoints
- `GET/POST/PUT/DELETE /api/appointments` - Appointment management endpoints
- `GET/POST/PUT/DELETE /api/products` - Product management endpoints
- `GET/POST/PUT/DELETE /api/sales-agenda` - Sales agenda management endpoints

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

**Backend (TypeScript):**
- `server/index.ts` - Express server setup with dependency injection
- `server/types/index.ts` - TypeScript type definitions for all entities
- `server/repositories/` - Data access layer
  - `base-repository.ts` - Abstract base with connection management
  - `user-repository.ts`, `deal-repository.ts`, `client-repository.ts`, etc.
- `server/services/` - Business logic layer
  - `auth-service.ts` - JWT authentication logic with bcrypt
  - `dashboard-service.ts`, `deal-service.ts`, `client-service.ts`, etc.
- `server/routes/` - Route handlers with TypeScript types
  - `auth-routes.ts`, `deal-routes.ts`, `client-routes.ts`, etc.
- `server/middleware/` - Express middleware (auth, upload, etc.)
- `server/database.ts` - PostgreSQL connection and database utilities
- `server/__tests__/` - Jest tests with mocked repositories

**Development Tools:**
- `dev-tools/test-browser.js` - Puppeteer browser automation test script
- `dev-tools/puppeteer-mcp/server.js` - MCP server for headless browser integration
- `dev-tools/screenshots/` - Generated browser test screenshots

## Entity Schemas

**Deal**: id, client, value, status ("Em Andamento"|"Proposta"|"Fechado"), date, description  
**Client**: id, name, email, phone, city, address, company  
**Appointment**: id, client, type ("Suporte"|"Vendas"|"Consultoria"), status, scheduled_datetime, description  
**Product**: id, name, price, category, stock, description  
**SalesAgenda**: id, title, client, value, date, status ("Ativa"|"Concluída"|"Cancelada")

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

**Backend (TypeScript):**
- **Language**: Full TypeScript with strict typing and ES modules
- **Architecture**: Layered architecture with Repository/Service/Route pattern
- **Database**: PostgreSQL with connection pooling and transaction support
- **Database Migrations**: Flyway with Docker integration for schema versioning
- **Authentication**: JWT tokens with configurable expiration
- **Security**: bcrypt password hashing, CORS configuration
- **Testing**: Jest framework with mocked repositories for unit testing
- **Dependency Injection**: Services injected into routes for testability
- **Environment**: Configurable via environment variables
- **API**: RESTful design with proper error handling and TypeScript types
- **Build**: TypeScript compilation to JavaScript with source maps

**Development & Testing:**
- **Puppeteer**: Headless browser automation for UI testing (devDependencies only)
- **MCP Integration**: Model Context Protocol server for browser automation
- **Browser Testing**: Automated login, form, and responsive design tests
- **Screenshots**: Automated visual testing with desktop/mobile viewports

## Authentication Flow

1. User enters credentials on `/` (login page)
2. Frontend validates email format and required fields
3. POST request to `/api/auth/login` with credentials
4. **TypeScript Backend**: 
   - Route handler (`auth-routes.ts`) receives request
   - Calls `AuthService.loginUser()` with credentials
   - `AuthService` uses `UserRepository.findByEmail()` to get user
   - Password verification with bcrypt
   - JWT token generation if credentials valid
5. On success: JWT token generated and returned with user data
6. Frontend stores token in localStorage and sets auth context
7. Protected routes check authentication status via context
8. Token verification happens on app initialization and API calls

## Database Schema

The current database schema is available at `db/schema/current-schema.sql`. This file contains the complete PostgreSQL schema including all tables, indexes, and constraints.

### Generating Current Schema
To generate the latest database schema:
```bash
npm run schema:dump
```
This command creates/updates `db/schema/current-schema.sql` with the current database structure.

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
- **Avoid breaking migrations**: When removing a used column, first add the new column, update the code, then plan a future migration to remove the old column
- **Update this documentation**: When learning about new patterns, tools, or implementation details that will speed up future work or reduce token usage, update this CLAUDE.md file immediately to preserve the knowledge
- use english as default for development (variables, file names, columns, tables, etc)

## TypeScript Backend Architecture

The backend has been converted to TypeScript with a proper layered architecture:

### Repository Layer (`server/repositories/`)
**Purpose**: Data access layer that handles all database operations
- `BaseRepository` - Abstract class with connection management and transaction support
- Entity repositories: `UserRepository`, `DealRepository`, `ClientRepository`, `ProductRepository`, `AppointmentRepository`, `SalesAgendaRepository`
- **Benefits**: Database queries are centralized, consistent error handling, easy to mock for testing

### Service Layer (`server/services/`)
**Purpose**: Business logic layer that orchestrates data operations and implements business rules
- `AuthService` - Authentication logic (login, register, token management)
- `DashboardService` - Aggregates stats from multiple repositories
- Entity services: `DealService`, `ClientService`, `ProductService`, `AppointmentService`, `SalesAgendaService`
- **Benefits**: Business logic is separated from HTTP concerns, fully testable with mocked repositories

### Route Layer (`server/routes/`)
**Purpose**: HTTP request/response handling with proper TypeScript types
- Clean route handlers that delegate to services
- TypeScript interfaces for request/response types
- Centralized error handling
- Authentication middleware integration

### Testing Strategy
- **Unit Tests**: Jest tests for service layer with mocked repositories
- **Mocking**: Repository interfaces are mocked to test business logic in isolation
- **Test Files**: Located in `server/__tests__/services/`
- **Coverage**: Focus on business logic testing rather than database integration

### Development Workflow
```bash
# Development with hot reload
npm run server:dev

# Build TypeScript
npm run server:build

# Run tests
npm run server:test

# Test with coverage
npm run server:test:coverage
```

### Type Safety Benefits
- **Compile-time checks**: Catch errors before runtime
- **IntelliSense**: Better IDE support and auto-completion
- **Refactoring safety**: Rename operations are safe across the codebase
- **API contracts**: Clear interfaces between layers