-- Fix profiles role check to match current user_role enum values
-- This script is idempotent: it will drop the old constraint if present and recreate
-- a new check constraint that matches the enum labels used elsewhere in the schema.
DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = 'profiles' AND constraint_name = 'profiles_role_check'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    END IF;

    -- Recreate constraint using the expected enum labels. Adjust this list if you
    -- intentionally use different labels in your deployment.
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (
        (role)::text = ANY (ARRAY['super_admin'::text, 'company_admin'::text, 'manager'::text, 'dispatcher'::text, 'driver'::text, 'customer'::text])
      );
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not recreate profiles_role_check: %', SQLERRM;
END $$;

-- End of migration
