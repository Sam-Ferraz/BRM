# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Business Relationship Management (BRM)** system - a comprehensive CRM application built with **Vite + React**. It manages customers, deals, products, service tickets, and sales agendas with a modern React/TypeScript stack.

**Architecture**: Vite + React Router with client-side components, mock backend API, shadcn/ui components, TailwindCSS styling.

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
```

## Key Architecture Patterns

### Data Layer
- **Mock API**: All data operations go through `src/lib/api.ts` which provides CRUD operations for all entities
- **Entities**: Negocio (deals), Cliente (customers), Atendimento (service tickets), Produto (products), PautaVenda (sales agenda)
- **API Pattern**: Each entity has `getAll()`, `create()`, `update()`, `delete()` methods with filtering/sorting support

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
- `/` - Login page (with language selector)
- `/dashboard` - Main dashboard
- `/negocios` - Deals management
- `/clientes` - Clients management
- `/atendimentos` - Services management
- `/produtos` - Products management
- `/pauta-vendas` - Sales agenda management
- `/configuracoes` - Settings/config page

## Key Files

- `src/lib/api.ts` - Mock backend API with all business logic
- `src/lib/i18n.ts` - Internationalization configuration and translations
- `src/pages/DashboardPage.tsx` - Main dashboard with navigation and charts
- `src/pages/ConfigPage.tsx` - Settings page with theme and language selection
- `src/components/forms/` - Reusable CRUD form components
- `src/App.tsx` - Main App component with React Router setup
- `vite.config.ts` - Vite configuration with path aliases

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

- **TypeScript**: Configured with relaxed settings for faster development
- **Path Aliases**: `@/` maps to `src/` for clean imports
- **Build**: Uses Vite for fast builds and HMR development