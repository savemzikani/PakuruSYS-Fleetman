-- Create company applications table for fleet owner onboarding
CREATE TABLE IF NOT EXISTS company_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) NOT NULL,
    tax_number VARCHAR(100),
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    fleet_size VARCHAR(50) NOT NULL,
    vehicle_types TEXT[] DEFAULT '{}',
    operating_regions TEXT[] DEFAULT '{}',
    specializations TEXT[] DEFAULT '{}',
    admin_user_id UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for company applications
ALTER TABLE company_applications ENABLE ROW LEVEL SECURITY;

-- Super admins can see all applications
CREATE POLICY "Super admins can view all applications" ON company_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

-- Super admins can update applications (approve/reject)
CREATE POLICY "Super admins can update applications" ON company_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

-- Users can view their own applications
CREATE POLICY "Users can view own applications" ON company_applications
    FOR SELECT USING (admin_user_id = auth.uid());

-- Anyone can insert applications (public registration)
CREATE POLICY "Anyone can create applications" ON company_applications
    FOR INSERT WITH CHECK (true);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_company_applications_updated_at 
    BEFORE UPDATE ON company_applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
