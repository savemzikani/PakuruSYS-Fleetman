-- Fix RLS policies for profiles table to allow super admin operations
-- This allows super admins to create company admin profiles

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Company admins can manage company profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;

-- Create new policies for profile management
CREATE POLICY "Company admins can manage company profiles" ON profiles
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() AND role = 'company_admin'
        )
    );

-- Allow super admins to manage all profiles
CREATE POLICY "Super admins can manage all profiles" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Allow super admins to insert profiles for any company
CREATE POLICY "Super admins can create profiles" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );
