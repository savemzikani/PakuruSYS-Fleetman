# Overview

This is a comprehensive SADC (Southern African Development Community) logistics management system designed for multi-tenant trucking companies. The application provides a complete business management solution for transportation and logistics companies operating across the SADC region, featuring role-based access control, fleet management, load tracking, customer management, and financial operations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: Next.js 14 with TypeScript and App Router
- **UI Library**: ShadCN/UI components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and theme support
- **State Management**: React hooks and Supabase real-time subscriptions
- **Forms**: React Hook Form with Zod validation for type-safe form handling

## Backend Architecture
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with email/password and role-based permissions
- **API**: Next.js API routes for server-side operations and PDF generation
- **Real-time**: Supabase real-time subscriptions for live data updates

## Multi-Tenant Architecture
- **Isolation Model**: Company-based data isolation using `company_id` foreign keys
- **Role Hierarchy**: Super Admin → Company Admin → Manager → Dispatcher → Driver
- **Data Segregation**: All business data is scoped to company level with RLS policies
- **Permission System**: Route-level and component-level access control based on user roles

## Core Data Models
- **Companies**: Multi-tenant container with subscription management
- **Profiles**: User accounts with role-based permissions and company associations
- **Vehicles**: Fleet management with maintenance tracking and status monitoring
- **Loads**: Shipment management with pickup/delivery tracking and customer assignments
- **Customers**: Client management with credit limits and payment terms
- **Invoices**: Financial operations with multi-currency support and PDF generation
- **Drivers**: Staff management with vehicle assignments and performance tracking

## Authentication & Authorization
- **Session Management**: Supabase middleware for automatic session refresh
- **Role-Based Access**: Granular permissions system with route protection
- **Multi-Role Support**: Users can have different access levels within their company
- **Security**: Row Level Security policies enforce company-based data isolation

## File Generation
- **PDF Reports**: React-PDF for generating invoices, reports, and shipping documents
- **Document Templates**: Configurable templates for different document types
- **Export Functionality**: CSV and PDF export capabilities for data analysis

# External Dependencies

## Core Services
- **Supabase**: Primary backend service providing PostgreSQL database, authentication, real-time subscriptions, and Row Level Security
- **Vercel**: Deployment platform with automatic CI/CD from repository changes
- **v0.app**: Development platform for component generation and design iteration

## UI & Components
- **Radix UI**: Headless component library providing accessible primitives for dialogs, dropdowns, forms, and navigation
- **Lucide React**: Icon library for consistent iconography across the application
- **Tailwind CSS**: Utility-first CSS framework with custom design system configuration

## Form & Validation
- **React Hook Form**: Form state management and validation library
- **Zod**: TypeScript-first schema validation for form inputs and API responses

## Data Visualization
- **Recharts**: Chart library for analytics dashboards and reporting features

## Development Tools
- **TypeScript**: Static type checking for enhanced developer experience and code reliability
- **Next.js**: React framework providing server-side rendering, API routes, and optimized builds
- **Geist Font**: Typography system for consistent text rendering

## Document Generation
- **React-PDF**: PDF generation library for creating invoices, reports, and shipping documents
- **Date-fns**: Date manipulation and formatting utilities

## Additional Libraries
- **Class Variance Authority**: Utility for creating component variants with TypeScript support
- **CLSX**: Conditional className utility for dynamic styling
- **Embla Carousel**: Carousel component for image galleries and content presentation