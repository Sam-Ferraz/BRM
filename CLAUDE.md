# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Business Relationship Management (BRM)** system - a comprehensive CRM application built with Next.js 15. It manages customers, deals, products, service tickets, and sales agendas with a modern React/TypeScript stack.

**Architecture**: Next.js App Router with client-side components, mock backend API, shadcn/ui components, TailwindCSS styling.

## Development Commands

```bash
# Development server
npm run dev

# Build for production  
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Key Architecture Patterns

### Data Layer
- **Mock API**: All data operations go through `lib/api.ts` which provides CRUD operations for all entities
- **Entities**: Negocio (deals), Cliente (customers), Atendimento (service tickets), Produto (products), PautaVenda (sales agenda)
- **API Pattern**: Each entity has `getAll()`, `create()`, `update()`, `delete()` methods with filtering/sorting support

### UI Architecture  
- **App Router**: Pages in `app/` directory with route-based organization
- **Forms**: Reusable form components in `components/forms/` using Dialog pattern
- **UI Components**: shadcn/ui components in `components/ui/`
- **Styling**: TailwindCSS with responsive design patterns

### Component Patterns
- **Page Structure**: Login → Dashboard → Entity pages (with CRUD operations)
- **Form Pattern**: Dialog-based forms with loading states and validation
- **Table Pattern**: Data tables with search, filtering, sorting, and pagination
- **Navigation**: Dashboard-centric with module navigation

## Key Files

- `lib/api.ts` - Mock backend API with all business logic
- `app/dashboard/page.tsx` - Main dashboard with navigation and charts
- `components/forms/` - Reusable CRUD form components
- `app/layout.tsx` - Root layout with theme provider

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
- **Navigation**: Badge-based shortcuts (a-e keys) for modules