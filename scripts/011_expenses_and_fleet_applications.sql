-- Add missing tables for expenses and fleet applications
-- These tables are required for the new server actions we implemented

-- Create expense category enum (if not exists)
DO $$ BEGIN
    CREATE TYPE expense_category AS ENUM (
        'fuel',
        'maintenance', 
        'repairs',
        'tolls',
        'insurance',
        'permits',
        'accommodation',
        'meals',
        'parking',
        'fines',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create expense status enum (if not exists)
DO $$ BEGIN
    CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create fleet application status enum (if not exists)
DO $$ BEGIN
    CREATE TYPE fleet_application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category expense_category NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency currency_code DEFAULT 'USD',
    expense_date DATE NOT NULL,
    load_id UUID REFERENCES loads(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    receipt_url TEXT,
    notes TEXT,
    status expense_status DEFAULT 'pending',
    submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fleet applications table
CREATE TABLE IF NOT EXISTS fleet_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_number VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    tax_number VARCHAR(100),
    business_license VARCHAR(255),
    fleet_size INTEGER DEFAULT 0,
    years_in_business INTEGER DEFAULT 0,
    services_offered TEXT,
    coverage_areas TEXT,
    insurance_details TEXT,
    business_references TEXT,
    additional_info TEXT,
    status fleet_application_status DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    approved_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_load_id ON expenses(load_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id ON expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by ON expenses(submitted_by);

CREATE INDEX IF NOT EXISTS idx_fleet_applications_status ON fleet_applications(status);
CREATE INDEX IF NOT EXISTS idx_fleet_applications_email ON fleet_applications(email);
CREATE INDEX IF NOT EXISTS idx_fleet_applications_country ON fleet_applications(country);

-- Row Level Security (RLS) policies for expenses
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Expenses policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Users can view expenses from their company') THEN
        CREATE POLICY "Users can view expenses from their company" ON expenses
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Users can create expenses for their company') THEN
        CREATE POLICY "Users can create expenses for their company" ON expenses
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND submitted_by = auth.uid()
    );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Users can update their own pending expenses') THEN
        CREATE POLICY "Users can update their own pending expenses" ON expenses
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND (
            submitted_by = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role IN ('super_admin', 'company_admin', 'manager')
            )
        )
    );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Managers can delete expenses from their company') THEN
        CREATE POLICY "Managers can delete expenses from their company" ON expenses
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND (
            submitted_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role IN ('super_admin', 'company_admin', 'manager')
            )
        )
    );
    END IF;
END $$;

-- Fleet applications policies (public table for applications, super admin for management)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fleet_applications') THEN
        ALTER TABLE fleet_applications ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fleet_applications' AND policyname = 'Anyone can create fleet applications') THEN
        CREATE POLICY "Anyone can create fleet applications" ON fleet_applications
    FOR INSERT WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fleet_applications' AND policyname = 'Super admins can view all applications') THEN
        CREATE POLICY "Super admins can view all applications" ON fleet_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fleet_applications' AND policyname = 'Super admins can update applications') THEN
        CREATE POLICY "Super admins can update applications" ON fleet_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );
    END IF;
END $$;

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_expenses_updated_at') THEN
        CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_fleet_applications_updated_at') THEN
        CREATE TRIGGER update_fleet_applications_updated_at BEFORE UPDATE ON fleet_applications
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
