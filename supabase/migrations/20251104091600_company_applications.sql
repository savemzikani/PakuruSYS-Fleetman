-- Company applications onboarding
SET statement_timeout = 0;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.company_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100) NOT NULL,
  tax_number VARCHAR(100),
  country VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  fleet_size VARCHAR(50) NOT NULL,
  vehicle_types TEXT[] DEFAULT '{}',
  operating_regions TEXT[] DEFAULT '{}',
  specializations TEXT[] DEFAULT '{}',
  admin_user_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.company_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view all applications" ON public.company_applications;
CREATE POLICY "Super admins can view all applications" ON public.company_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super admins can update applications" ON public.company_applications;
CREATE POLICY "Super admins can update applications" ON public.company_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own applications" ON public.company_applications;
CREATE POLICY "Users can view own applications" ON public.company_applications
  FOR SELECT USING (admin_user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can create applications" ON public.company_applications;
CREATE POLICY "Anyone can create applications" ON public.company_applications
  FOR INSERT WITH CHECK (TRUE);

DROP TRIGGER IF EXISTS update_company_applications_updated_at ON public.company_applications;
CREATE TRIGGER update_company_applications_updated_at
  BEFORE UPDATE ON public.company_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
