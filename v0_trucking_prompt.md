# V0 Prompt: SADC Trucking/Logistics Management System

Create a comprehensive trucking and logistics business management application with the following specifications:

## Tech Stack Requirements
- **Frontend**: Next.js 14+ with TypeScript
- **UI Components**: ShadCN/UI blocks and components
- **Backend**: Supabase (PostgreSQL database, authentication, real-time subscriptions)
- **Styling**: Tailwind CSS
- **PDF Generation**: React-PDF or jsPDF for reports and invoices
- **Forms**: React Hook Form with Zod validation

## Core Application Structure

### Multi-Tenant Architecture
- **Super Admin Level**: Manages all truck owner companies
- **Company Level**: Individual trucking companies with their own data isolation
- **Role-Based Access Control**: Super Admin → Company Admin → Manager → Dispatcher → Driver

### User Roles & Permissions

#### Super Admin
- Manage all trucking companies
- **Fleet Owner Onboarding**: Review and approve new company applications
- Enable/disable company access based on payment status
- System-wide analytics and reporting
- User management across all companies
- Billing and subscription management
- **Company Verification**: Validate business licenses, permits, and documentation

#### Company Admin (Truck Owner)
- Full access to their company's data
- Manage company users (managers, dispatchers, drivers)
- Company settings and configurations
- Financial overview and reporting
- Fleet management

#### Manager
- Fleet operations oversight
- Driver and truck assignments
- Load planning and optimization
- Customer relationship management
- Financial reporting (view-only)

#### Dispatcher
- Create and assign loads
- Track shipments in real-time
- Communicate with drivers
- Customer communication
- Generate quotes and invoices

#### Driver
- View assigned loads
- Update delivery status
- Submit proof of delivery (POD)
- Expense reporting
- Mobile-optimized interface

#### Customer (Client Portal)
- View service history and active shipments
- Accept/reject quotes and negotiate terms
- Make invoice payments online
- Track shipments (if real-time tracking enabled)
- Submit new load requests
- Download invoices and receipts
- Communication with dispatchers
- Rate and review services

## Core Features & Modules

### 1. Dashboard Module
- Role-specific dashboards with relevant KPIs
- Real-time fleet tracking
- Revenue and expense summaries
- Recent activities and alerts
- SADC region-specific metrics

### 2. Fleet Management
- **Trucks**: Registration, specifications, maintenance schedules
- **Drivers**: Licenses, certifications, performance tracking
- **Vehicle compliance**: SADC cross-border documentation
- **Fuel management**: Consumption tracking, cost analysis

### 3. Load Management
- Load creation with origin/destination (SADC countries)
- Route planning and optimization
- Load assignment to drivers/trucks
- Real-time tracking and status updates
- POD (Proof of Delivery) collection

### 4. Customer Management
- Customer profiles and contact information
- Credit limits and payment terms
- Service history and preferences
- Communication logs
- SADC region customer categorization

### 5. Financial Management
- **Invoicing**: Automated invoice generation
- **Quotes**: Quick quote creation and approval workflow
- **Expense Tracking**: Fuel, maintenance, tolls, permits
- **Payment Tracking**: Outstanding invoices, payment history
- **Multi-currency support**: USD, ZAR, BWP, etc.

### 6. Reporting & Analytics
- **Financial Reports**: P&L, cash flow, revenue by route
- **Operational Reports**: Fleet utilization, driver performance
- **Compliance Reports**: Border crossing logs, permit status
- **PDF Export**: All reports exportable as PDF
- **SADC-specific**: Cross-border transaction reports

### 7. Document Management
### 9. Feature Toggle System
- Digital storage for permits, licenses, insurance
- SADC cross-border documentation
- Automated document expiry alerts
- PDF generation for official documents
- Customer document sharing via portal

### 10. Document Management

### Regional Considerations
- **Countries**: Support for all 16 SADC member states
- **Currencies**: Multi-currency support (USD, ZAR, BWP, NAD, etc.)
- **Languages**: English primary, with localization options
- **Time Zones**: SADC region time zones (CAT, SAST, etc.)
- **Regulations**: SADC transport protocols and cross-border requirements

### Cross-Border Features
- Border crossing documentation management
- Permit and license tracking by country
- Customs declaration integration
- Transit route optimization
- Multi-country regulatory compliance

## Key Architecture Principles

### Fault Tolerance & Feature Resilience
- **Graceful Degradation**: If real-time tracking fails, basic load management continues
- **Feature Isolation**: Disabled features don't break core functionality
- **Error Boundaries**: Component-level error handling prevents cascading failures
- **Offline Capability**: Core features work without internet (mobile drivers)
- **Progressive Enhancement**: Advanced features enhance but don't block basic operations

### Customer Portal Integration
- **Seamless Onboarding**: Trucking companies can invite customers to portal
- **White-Label Experience**: Portal reflects trucking company branding
- **Mobile-Responsive**: Customers can access portal from any device
- **Secure Access**: Customer-specific data isolation and permissions
- **Payment Integration**: Support for local SADC payment methods

### Feature Toggle Implementation
```javascript
// Example feature flag usage
const useFeatures = (companyId) => {
  const { data: features } = useQuery(['features', companyId], 
    () => getCompanyFeatures(companyId)
  );
  
  return {
    hasRealTimeTracking: features?.realTimeTracking || false,
    hasAdvancedAnalytics: features?.advancedAnalytics || false,
    hasCustomerPortal: features?.customerPortal || false,
    // etc.
  };
};
```

## Technical Requirements
```sql
-- Key tables needed:
- companies (multi-tenant isolation with feature flags and subscription status)
- company_applications (pending fleet owner registrations)
- users (with role-based permissions including customers)
- trucks (fleet management)
- drivers (driver profiles)
- loads (shipment management)
- customers (client management with portal access)
- invoices (financial management with payment tracking)
- quotes (pricing management with customer approval workflow)
- documents (file management with customer access)
- routes (SADC route optimization)
- payments (customer payment processing)
- subscriptions (company billing and plan management)
- feature_flags (company-specific feature toggles)
- customer_portal_sessions (customer login tracking)
```

### Authentication & Security
- Row Level Security (RLS) for multi-tenant data isolation
- JWT-based authentication via Supabase Auth
- Role-based permission system
- Company-level data segregation
- Audit logging for all critical actions

### UI/UX Requirements
- Responsive design (mobile-first for drivers)
- Dark/light theme support
- Offline capability for mobile users
- Real-time updates via Supabase subscriptions
- Intuitive navigation with role-based menus

## Key Features to Implement

### Phase 1 (Core MVP)
1. **Fleet Owner Registration System**: Public application form and Super Admin approval workflow
2. User authentication and role management (including customer portal)
3. **Subscription Management**: Basic billing and plan management
4. Basic fleet management (trucks, drivers)
5. Simple load creation and tracking
6. Customer management with portal registration
7. Basic invoicing with payment processing
8. Company onboarding for Super Admin
9. Feature toggle system implementation
10. Quote acceptance/rejection workflow

### Phase 2 (Enhanced Features)
1. Advanced reporting and analytics (toggleable)
2. PDF generation for all documents
3. Real-time tracking integration (optional feature)
4. Enhanced customer portal features
5. Expense tracking and management
6. Advanced document management
7. Customer rating and feedback system
8. Payment gateway integrations

### Phase 3 (SADC Optimization)
1. Multi-currency and localization
2. Cross-border compliance features
3. Route optimization for SADC region
4. Advanced analytics and insights
5. Mobile app optimization
6. API integrations (fuel, tracking, etc.)

## Component Structure
Use ShadCN blocks for:
- Dashboard layouts
- Data tables for fleet, loads, customers
- Form components for data entry
- Card layouts for summaries
- Navigation components
- Modal dialogs for quick actions

## Data Visualization
- Charts for financial metrics
- Maps for route tracking
- KPI cards for dashboard metrics
- Progress indicators for load status
- Calendar views for scheduling

## Integration Requirements
- Google Maps/OpenStreetMap for routing
- SMS/Email notifications
- Payment gateway integration (local SADC options: EFT, mobile money)
- Customer portal notification system
- Feature flag management APIs
- Graceful API fallbacks for when services are unavailable

## Customer Portal Specifications

### Portal Features
- **Dashboard**: Recent shipments, pending quotes, outstanding invoices
- **Shipment Tracking**: View current and historical shipments
- **Financial Management**: Pay invoices, view payment history, download receipts  
- **Quote System**: Receive, review, accept/reject quotes with negotiation capability
- **Load Requests**: Submit new shipment requests with detailed requirements
- **Communication**: Direct messaging with trucking company team
- **Account Settings**: Manage profile, payment methods, notification preferences
- **Performance Reports**: View service metrics and historical data

### Customer Onboarding Flow
1. Trucking company sends portal invitation to customer
2. Customer creates account with email verification
3. Customer completes profile and adds payment methods
4. Trucking company approves customer account
5. Customer gains access to full portal functionality

### Customer Payment Processing
- Support multiple payment methods (card, EFT, mobile money)
- Automated invoice payment reminders
- Payment plan options for large invoices
- Multi-currency payment processing
- Receipt generation and email delivery
- Integration with local SADC payment providers

## Fleet Owner Onboarding Flow

### Public Registration Process
1. **Landing Page**: Public-facing registration page with clear pricing and features
2. **Application Form**: Multi-step form collecting:
   - Company details (name, registration number, VAT number)
   - Contact information (address, phone, email)
   - Fleet information (truck count, types, operating regions)
   - Business documents (registration certificate, operating licenses)
   - Insurance and compliance documents
   - Bank account details for billing
   - Subscription plan selection

3. **Document Upload**: Secure file upload with validation
4. **Application Submission**: Automated confirmation email sent

### Super Admin Review Process
1. **Application Dashboard**: Queue of pending applications
2. **Document Review**: Verify business registration, licenses, insurance
3. **Compliance Checks**: Automated validation where possible (tax numbers, etc.)
4. **Approval/Rejection**: 
   - **Approved**: Account created, trial period starts, welcome email sent
   - **Rejected**: Clear feedback provided, option to resubmit with corrections

### Account Activation
1. **Trial Period**: 30 days free access with basic features
2. **Payment Setup**: Billing information collection and verification
3. **Full Activation**: Once payment confirmed, full feature access granted
4. **Onboarding Support**: Welcome tutorial and setup assistance

### Ongoing Management
- **Subscription Monitoring**: Automated payment processing and renewal
- **Account Status**: Active, Trial, Overdue, Suspended states
- **Feature Access**: Automatic feature enabling/disabling based on subscription status
- **Support System**: Help desk integration for new fleet owners

This system ensures quality control while making it easy for legitimate trucking companies to join the platform across the SADC region.

Please create a modular, scalable application that can grow from a single trucking company to supporting multiple companies across the SADC region. Focus on clean code architecture, proper error handling, and excellent user experience across all user roles.