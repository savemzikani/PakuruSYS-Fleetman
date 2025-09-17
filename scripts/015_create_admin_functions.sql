-- Create RPC function to allow super admins to create company admin profiles
-- This bypasses RLS restrictions for authorized super admin operations

CREATE OR REPLACE FUNCTION create_company_admin_profile(
    p_company_id UUID,
    p_email VARCHAR,
    p_first_name VARCHAR,
    p_last_name VARCHAR,
    p_phone VARCHAR DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_current_user_role VARCHAR;
BEGIN
    -- Check if current user is super admin
    SELECT role INTO v_current_user_role 
    FROM profiles 
    WHERE id = auth.uid();
    
    IF v_current_user_role != 'super_admin' THEN
        RAISE EXCEPTION 'Access denied. Super admin role required.';
    END IF;
    
    -- Generate new UUID for the profile
    v_user_id := gen_random_uuid();
    
    -- Insert the new profile
    INSERT INTO profiles (
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
        NOW(),
        NOW()
    );
    
    RETURN v_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_company_admin_profile TO authenticated;
