-- Profile admin helpers and role constraint alignment
SET statement_timeout = 0;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (
    role::text = ANY (
      ARRAY[
        'super_admin'::text,
        'company_admin'::text,
        'manager'::text,
        'dispatcher'::text,
        'driver'::text,
        'customer'::text
      ]
    )
  );

CREATE OR REPLACE FUNCTION public.create_company_admin_profile(
  p_company_id UUID,
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF public.get_user_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'Access denied. Super admin role required.';
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO public.profiles (
    id,
    company_id,
    email,
    first_name,
    last_name,
    phone,
    role,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_company_id,
    p_email,
    p_first_name,
    p_last_name,
    p_phone,
    'company_admin',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  );

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_company_admin_profile(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
