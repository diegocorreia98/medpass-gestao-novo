# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MedPass Gestão is a React/TypeScript application built with Vite for managing healthcare plans and units. The application serves two main user types: "matriz" (headquarters) and "unidade" (units), each with distinct access levels and functionality.

## Development Commands

- `npm run dev` - Start development server (available at localhost:8080)
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Architecture

### Tech Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with SWC
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Authentication**: Supabase Auth with custom profiles system

### Project Structure

```
src/
├── components/        # Reusable UI components (shadcn/ui based)
├── contexts/         # React contexts (Auth, Panel)
├── hooks/           # Custom hooks
├── integrations/    # External service integrations (Supabase)
├── lib/            # Utility libraries and configurations
├── pages/          # Route components
├── services/       # Business logic and API calls
├── types/          # TypeScript type definitions
└── utils/          # Helper utilities
```

### Key Architectural Patterns

#### Authentication System
- Two-tier authentication: Supabase Auth + custom profiles table
- User types: "matriz" and "unidade" with role-based access control
- `AuthContext` provides user session, profile data, and auth methods
- `ProtectedRoute` component handles route-level authorization
- Profile verification happens during sign-in to ensure proper user type access

#### Route Structure
The application has distinct route hierarchies:
- **Public routes**: `/`, `/checkout`, auth pages
- **Matriz routes**: `/dashboard`, `/orcamento`, `/planos`, admin features
- **Unidade routes**: `/unidade/*` - unit-specific functionality
- **Shared routes**: `/perfil`, `/configuracoes`

#### Component Organization
- Uses shadcn/ui component system with Radix UI primitives
- Layout wrapper (`Layout`) provides consistent structure for protected routes
- Theme support via `ThemeProvider` (light/dark/system)
- Toast notifications using both shadcn Toaster and Sonner

#### State Management
- React Query for server state, caching, and data fetching
- Context providers for global state (Auth, Panel)
- Local state with React hooks for component-specific data

### Supabase Integration

The app connects to Supabase with:
- Database client in `src/integrations/supabase/client.ts`
- Auto-generated types from Supabase schema
- Row Level Security (RLS) for data access control
- Edge Functions for specialized operations (password reset)

### Development Notes

#### File Conventions
- Components use PascalCase filenames
- Pages are in `src/pages/` and match route paths
- Custom hooks start with `use` prefix
- Types are defined in dedicated files under `src/types/`

#### Path Aliases
- `@/` maps to `src/` directory for clean imports

#### Environment
- Uses `.env` file for configuration (not included in repo)
- Supabase credentials are in the client file (public keys only)

#### Build Configuration
- Vite config includes custom port (8080) and host (`::`)
- Development mode includes component tagging via `lovable-tagger`
- TypeScript strict mode enabled