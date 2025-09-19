# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

PakuruSys Fleetman is a comprehensive trucking and logistics management system built for the SADC region. This is a Next.js 14 application using TypeScript, Supabase for database/auth, and Tailwind CSS with shadcn/ui components.

## Essential Development Commands

### Development Server
```bash
npm run dev              # Start development server at http://localhost:3000
```

### Building and Production
```bash
npm run build            # Build for production
npm run build:analyze    # Build with bundle analyzer
npm start               # Start production server
```

### Testing
```bash
npm test                # Run Jest unit tests
npm run test:watch      # Run Jest in watch mode  
npm run test:coverage   # Run tests with coverage report
npm run test:e2e        # Run Playwright E2E tests
npm run test:e2e:ui     # Run E2E tests with UI
npm run test:all        # Run all tests (unit + E2E)
```

### Code Quality
```bash
npm run lint            # Run ESLint
npm run deploy:check    # Lint + build check
npm run deploy:check:full # Full pre-deployment check (lint + test + build)
```

### Docker Development
```bash
docker-compose up       # Run with Docker
docker-compose up --profile production # Run with nginx proxy
```

## Architecture Overview

### Authentication & Authorization
- **Supabase Auth**: Handles user authentication with email/password
- **Role-based Access**: Super Admin, Company Admin, Manager, Dispatcher, Driver roles
- **Row Level Security**: Database-level access control per company
- **Middleware**: Server-side session management with `middleware.ts`

### Data Architecture
- **Multi-tenant**: Each company has isolated data via `company_id` foreign keys
- **Supabase Database**: PostgreSQL with RLS policies for data isolation
- **Server Components**: Database queries happen server-side using `@/lib/supabase/server`
- **Client Components**: Interactive UI with `@/lib/supabase/client` for real-time features

### Application Structure
- **App Router**: Next.js 13+ file-based routing in `app/` directory
- **Route Protection**: Authentication checks in page components before rendering
- **Modular Components**: Organized by feature areas (dashboard, admin, quotes, etc.)
- **shadcn/ui**: Consistent design system with Radix UI primitives

### Key Application Areas
- **Dashboard**: Role-based metrics and activity overview (`app/dashboard/`)
- **Admin Panel**: Super admin system management (`app/admin/`)  
- **Load Management**: Shipment tracking and dispatch
- **Fleet Management**: Vehicle and driver management
- **Customer Management**: Client and quote management
- **Financial Management**: Invoicing and expense tracking

### Component Organization
```
components/
├── admin/          # Super admin specific components
├── dashboard/      # Main dashboard widgets  
├── pdf/           # PDF generation components
├── quotes/        # Quote management components
├── ui/            # shadcn/ui base components
└── theme-provider.tsx
```

### Database Patterns
- Server Actions for mutations (form submissions)
- Server Components for data fetching with Supabase client
- Optimistic updates for real-time feel where appropriate
- Type-safe database queries with proper TypeScript integration

## Environment Setup

1. Copy `env.example` to `.env.local`
2. Configure Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Configure email service (SendGrid, Resend, AWS SES, or SMTP)
4. Set `EMAIL_PROVIDER` to chosen service

## Testing Strategy

### Unit Tests (Jest)
- **Location**: `__tests__/` directory
- **Client Tests**: Components and utilities (jsdom environment)
- **Server Tests**: API routes and server logic (node environment) 
- **Coverage**: Minimum thresholds set in `jest.config.js`

### E2E Tests (Playwright)
- **Location**: `e2e/` directory
- **Multi-browser**: Chrome, Firefox, Safari, Mobile viewports
- **Auth Setup**: `e2e/auth.setup.ts` for authenticated test scenarios
- **CI Integration**: Retry logic and failure reporting configured

## Development Guidelines

### Authentication Patterns
- Always check user authentication in page components
- Use `createClient()` from `@/lib/supabase/server` for server-side auth
- Redirect unauthenticated users to `/auth/login`
- Check user roles before showing admin features

### Database Queries
- Use server-side Supabase client for security
- Always filter by `company_id` for multi-tenant data isolation
- Use TypeScript for query type safety
- Implement proper error handling for database operations

### Component Patterns  
- Server Components for data fetching by default
- Client Components only when interactivity needed
- Use shadcn/ui components for consistency
- Implement proper loading states and error boundaries

### Code Quality
- Follow ESLint configuration in `.eslintrc.json`
- Use TypeScript strictly - build fails on type errors
- Test components with React Testing Library
- E2E test critical user journeys

### Performance Considerations
- Next.js Image optimization enabled
- Bundle analysis available with `npm run build:analyze`
- Standalone Docker builds for production deployment
- Aggressive caching and compression configured

This is a production logistics application serving trucking companies across the SADC region, so prioritize data security, multi-tenancy, and reliable operations.