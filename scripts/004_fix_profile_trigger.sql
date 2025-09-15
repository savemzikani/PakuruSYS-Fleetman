-- Fix profile creation trigger to handle empty company_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        first_name, 
        last_name, 
        email, 
        role,
        company_id
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'User'),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'Name'),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'driver'),
        -- Handle empty string company_id properly
        CASE 
            WHEN NEW.raw_user_meta_data ->> 'company_id' IS NULL OR NEW.raw_user_meta_data ->> 'company_id' = '' 
            THEN NULL 
            ELSE (NEW.raw_user_meta_data ->> 'company_id')::UUID 
        END
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;
