-- User invitations workflow
SET statement_timeout = 0;

DO $$
BEGIN
  CREATE TYPE public.invitation_status AS ENUM ('pending','accepted','expired','revoked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  role user_role NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email, status)
);

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_user_invitations_updated_at ON public.user_invitations;
CREATE TRIGGER update_user_invitations_updated_at
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS user_invitations_manage_super_admin ON public.user_invitations;
CREATE POLICY user_invitations_manage_super_admin ON public.user_invitations
  FOR ALL USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS user_invitations_view_company ON public.user_invitations;
CREATE POLICY user_invitations_view_company ON public.user_invitations
  FOR SELECT USING (
    public.get_user_role() IN ('super_admin','company_admin','manager','dispatcher')
    AND (company_id IS NULL OR company_id = public.get_user_company_id())
  );

CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_company ON public.user_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON public.user_invitations(status);

ALTER TABLE public.profiles ALTER COLUMN is_active SET DEFAULT FALSE;
