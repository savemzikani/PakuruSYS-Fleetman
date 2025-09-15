-- Fix infinite recursion in profiles RLS policies
-- The issue is that policies were querying the profiles table to check roles,
-- which creates circular dependency when accessing profiles

-- Drop the problematic policies
DROP POLICY IF EXISTS "Company admins can view company profiles" ON profiles;
DROP POLICY IF EXISTS "Company admins can manage company profiles" ON profiles;

-- Create a security definer function to check user role without RLS
CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Create a security definer function to get user company_id without RLS
CREATE OR REPLACE FUNCTION auth.get_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$;

-- Create new policies that use security definer functions to avoid recursion
CREATE POLICY "Company admins can view company profiles" ON profiles
    FOR SELECT USING (
        -- Super admins can see all profiles
        auth.get_user_role() = 'super_admin' OR
        -- Company admins can see profiles in their company
        (auth.get_user_role() IN ('company_admin', 'manager') AND 
         company_id = auth.get_user_company_id()) OR
        -- Users can see their own profile
        id = auth.uid()
    );

CREATE POLICY "Company admins can manage company profiles" ON profiles
    FOR ALL USING (
        -- Super admins can manage all profiles
        auth.get_user_role() = 'super_admin' OR
        -- Company admins can manage profiles in their company
        (auth.get_user_role() = 'company_admin' AND 
         company_id = auth.get_user_company_id())
    );

-- Also fix other policies that might have similar issues
-- Update companies policies to use the new functions
DROP POLICY IF EXISTS "Companies can view their own data" ON companies;
CREATE POLICY "Companies can view their own data" ON companies
    FOR SELECT USING (
        auth.get_user_role() = 'super_admin' OR
        id = auth.get_user_company_id()
    );

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION auth.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.get_user_company_id() TO authenticated;
