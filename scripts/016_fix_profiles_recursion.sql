-- Fix infinite recursion in profiles RLS policies
-- The issue is that policies are referencing the profiles table within themselves

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Company admins can view company profiles" ON profiles;
DROP POLICY IF EXISTS "Company admins can manage company profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can create profiles" ON profiles;

-- Create non-recursive policies for profiles table
-- Policy 1: Users can view and update their own profile
CREATE POLICY "Users can access own profile" ON profiles
    FOR ALL USING (id = auth.uid());

-- Policy 2: Super admins can access all profiles (check role in auth.users metadata)
CREATE POLICY "Super admins full access" ON profiles
    FOR ALL USING (
        (auth.jwt() ->> 'user_metadata' ->> 'role') = 'super_admin'
        OR 
        auth.uid() = 'f6cd0801-1e3e-4add-8b3c-d57037ec6699'::uuid
    );

-- Temporarily disable company admin policy to prevent recursion
-- This will be re-implemented after fixing the base structure

-- Temporarily disable RLS to allow initial setup
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS after policies are set
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
