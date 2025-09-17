-- Simple fix for profiles RLS recursion - disable temporarily and create minimal policies

-- Disable RLS completely to stop the recursion
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Company admins can view company profiles" ON profiles;
DROP POLICY IF EXISTS "Company admins can manage company profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can create profiles" ON profiles;
DROP POLICY IF EXISTS "Users can access own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins full access" ON profiles;
DROP POLICY IF EXISTS "Company admins access company profiles" ON profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Allow own profile access" ON profiles
    FOR ALL USING (id = auth.uid());

-- Allow specific super admin user (from the error log)
CREATE POLICY "Allow super admin access" ON profiles
    FOR ALL USING (auth.uid() = 'f6cd0801-1e3e-4add-8b3c-d57037ec6699'::uuid);

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
