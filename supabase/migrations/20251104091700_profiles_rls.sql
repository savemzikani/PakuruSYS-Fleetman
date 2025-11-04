-- Enhanced profile and company RLS with helper functions
SET statement_timeout = 0;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;

DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
DROP POLICY IF EXISTS "Company admins can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Company admins can manage company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can access their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can access own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow own profile access" ON public.profiles;

CREATE POLICY profiles_select_scoped ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR public.get_user_role() = 'super_admin'
    OR (
      public.get_user_role() IN ('company_admin', 'manager')
      AND company_id = public.get_user_company_id()
    )
  );

CREATE POLICY profiles_manage_company ON public.profiles
  FOR ALL USING (
    public.get_user_role() = 'super_admin'
    OR (
      public.get_user_role() = 'company_admin'
      AND company_id = public.get_user_company_id()
    )
  )
  WITH CHECK (
    public.get_user_role() = 'super_admin'
    OR (
      public.get_user_role() = 'company_admin'
      AND company_id = public.get_user_company_id()
    )
  );

DROP POLICY IF EXISTS companies_select ON public.companies;
DROP POLICY IF EXISTS "Companies can view their own data" ON public.companies;

CREATE POLICY companies_select_scoped ON public.companies
  FOR SELECT USING (
    public.get_user_role() = 'super_admin'
    OR id = public.get_user_company_id()
  );
