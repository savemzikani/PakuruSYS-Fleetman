-- Create user invitations table for secure, invitation-only onboarding

-- Enum for invitation status (kept minimal for current usage)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
        CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
    END IF;
END$$;

DO $$
BEGIN
    -- auth.get_user_role()
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'get_user_role' AND n.nspname = 'public'
    ) THEN
        CREATE OR REPLACE FUNCTION public.get_user_role()
        RETURNS user_role
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public
        AS $fn$
          SELECT role FROM profiles WHERE id = auth.uid();
        $fn$;
        GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
    END IF;

    -- auth.get_user_company_id()
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'get_user_company_id' AND n.nspname = 'public'
    ) THEN
        CREATE OR REPLACE FUNCTION public.get_user_company_id()
        RETURNS uuid
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public
        AS $fn$
          SELECT company_id FROM profiles WHERE id = auth.uid();
        $fn$;
        GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
    END IF;
END$$;

-- Table definition
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    role user_role NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    status invitation_status NOT NULL DEFAULT 'pending',
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(email, status)
);

-- Maintain updated_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'update_user_invitations_updated_at'
        ) THEN
            CREATE TRIGGER update_user_invitations_updated_at
            BEFORE UPDATE ON user_invitations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
    END IF;
END$$;

-- RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Policies: Super admins can do everything
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_invitations' AND policyname = 'Super admins can manage invitations'
    ) THEN
        CREATE POLICY "Super admins can manage invitations" ON user_invitations
            FOR ALL USING (public.get_user_role() = 'super_admin')
            WITH CHECK (public.get_user_role() = 'super_admin');
    END IF;
END$$;

-- Optionally allow company_admins to view invitations for their company
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_invitations' AND policyname = 'Company admins can view company invitations'
    ) THEN
        CREATE POLICY "Company admins can view company invitations" ON user_invitations
            FOR SELECT USING (
                public.get_user_role() IN ('company_admin', 'manager', 'dispatcher', 'super_admin') AND
                (company_id IS NULL OR company_id = public.get_user_company_id())
            );
    END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_company ON user_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);


