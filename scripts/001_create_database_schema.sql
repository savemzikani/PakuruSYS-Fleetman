-- SADC Trucking and Logistics Management System Database Schema
-- Multi-tenant architecture with role-based access control

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for various status fields
CREATE TYPE user_role AS ENUM ('super_admin', 'company_admin', 'manager', 'dispatcher', 'driver');
CREATE TYPE company_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE vehicle_status AS ENUM ('active', 'maintenance', 'out_of_service', 'retired');
CREATE TYPE load_status AS ENUM ('pending', 'assigned', 'in_transit', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE document_type AS ENUM ('invoice', 'pod', 'customs', 'permit', 'insurance', 'other');
CREATE TYPE currency_code AS ENUM ('USD', 'ZAR', 'BWP', 'NAD', 'SZL', 'LSL', 'MWK', 'ZMW', 'ZWL', 'MZN', 'ANG', 'MGA', 'MUR', 'SCR');

-- Companies table (multi-tenant)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) UNIQUE,
    tax_number VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    status company_status DEFAULT 'active',
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicles/Fleet table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    registration_number VARCHAR(50) NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    vin VARCHAR(100),
    engine_number VARCHAR(100),
    fuel_type VARCHAR(50),
    capacity_tons DECIMAL(10,2),
    status vehicle_status DEFAULT 'active',
    insurance_expiry DATE,
    license_expiry DATE,
    last_service_date DATE,
    next_service_due DATE,
    odometer_reading INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, registration_number)
);

-- Drivers table
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    license_expiry DATE NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, license_number)
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    tax_number VARCHAR(100),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30, -- days
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loads/Shipments table
CREATE TABLE loads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    load_number VARCHAR(100) NOT NULL,
    description TEXT,
    weight_kg DECIMAL(10,2),
    volume_m3 DECIMAL(10,2),
    pickup_address TEXT NOT NULL,
    pickup_city VARCHAR(100),
    pickup_country VARCHAR(100),
    pickup_date TIMESTAMP WITH TIME ZONE,
    delivery_address TEXT NOT NULL,
    delivery_city VARCHAR(100),
    delivery_country VARCHAR(100),
    delivery_date TIMESTAMP WITH TIME ZONE,
    status load_status DEFAULT 'pending',
    rate DECIMAL(15,2),
    currency currency_code DEFAULT 'USD',
    assigned_vehicle_id UUID REFERENCES vehicles(id),
    assigned_driver_id UUID REFERENCES drivers(id),
    dispatcher_id UUID REFERENCES profiles(id),
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, load_number)
);

-- Load tracking/status updates
CREATE TABLE load_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    status load_status NOT NULL,
    location TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    notes TEXT,
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    load_id UUID REFERENCES loads(id),
    invoice_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    currency currency_code DEFAULT 'USD',
    status payment_status DEFAULT 'pending',
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, invoice_number)
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    load_id UUID REFERENCES loads(id),
    invoice_id UUID REFERENCES invoices(id),
    document_type document_type NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Companies can view their own data" ON companies
    FOR SELECT USING (
        id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can manage companies" ON companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Company admins can view company profiles" ON profiles
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

CREATE POLICY "Company admins can manage company profiles" ON profiles
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

-- RLS Policies for vehicles
CREATE POLICY "Company users can view company vehicles" ON vehicles
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Managers and admins can manage vehicles" ON vehicles
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('company_admin', 'manager', 'super_admin')
        )
    );

-- RLS Policies for drivers
CREATE POLICY "Company users can view company drivers" ON drivers
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Managers and admins can manage drivers" ON drivers
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('company_admin', 'manager', 'super_admin')
        )
    );

-- RLS Policies for customers
CREATE POLICY "Company users can view company customers" ON customers
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Managers and admins can manage customers" ON customers
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('company_admin', 'manager', 'dispatcher', 'super_admin')
        )
    );

-- RLS Policies for loads
CREATE POLICY "Company users can view company loads" ON loads
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Dispatchers and above can manage loads" ON loads
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('company_admin', 'manager', 'dispatcher', 'super_admin')
        )
    );

-- RLS Policies for load_tracking
CREATE POLICY "Company users can view load tracking" ON load_tracking
    FOR SELECT USING (
        load_id IN (
            SELECT id FROM loads WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Drivers and dispatchers can update tracking" ON load_tracking
    FOR INSERT WITH CHECK (
        load_id IN (
            SELECT id FROM loads WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- RLS Policies for invoices
CREATE POLICY "Company users can view company invoices" ON invoices
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Managers and admins can manage invoices" ON invoices
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('company_admin', 'manager', 'super_admin')
        )
    );

-- RLS Policies for documents
CREATE POLICY "Company users can view company documents" ON documents
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Company users can upload documents" ON documents
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_profiles_company_id ON profiles(company_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_drivers_company_id ON drivers(company_id);
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_loads_company_id ON loads(company_id);
CREATE INDEX idx_loads_status ON loads(status);
CREATE INDEX idx_loads_customer_id ON loads(customer_id);
CREATE INDEX idx_load_tracking_load_id ON load_tracking(load_id);
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_documents_company_id ON documents(company_id);
CREATE INDEX idx_documents_load_id ON documents(load_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loads_updated_at BEFORE UPDATE ON loads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
