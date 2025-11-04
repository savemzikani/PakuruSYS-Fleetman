-- Expenses and fleet applications schema
SET statement_timeout = 0;

DO $$
BEGIN
  CREATE TYPE public.expense_category AS ENUM (
    'fuel','maintenance','repairs','tolls','insurance','permits','accommodation',
    'meals','parking','fines','other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.expense_status AS ENUM ('pending','approved','rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.fleet_application_status AS ENUM ('pending','approved','rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category expense_category NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency currency_code DEFAULT 'USD',
  expense_date DATE NOT NULL,
  load_id UUID REFERENCES public.loads(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  receipt_url TEXT,
  notes TEXT,
  status expense_status DEFAULT 'pending',
  submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fleet_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_number VARCHAR(50) UNIQUE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20),
  tax_number VARCHAR(100),
  business_license VARCHAR(255),
  fleet_size INTEGER DEFAULT 0,
  years_in_business INTEGER DEFAULT 0,
  services_offered TEXT,
  coverage_areas TEXT,
  insurance_details TEXT,
  business_references TEXT,
  additional_info TEXT,
  status fleet_application_status DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  approved_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expenses_select_scoped ON public.expenses;
DROP POLICY IF EXISTS expenses_insert_scoped ON public.expenses;
DROP POLICY IF EXISTS expenses_update_scoped ON public.expenses;
DROP POLICY IF EXISTS expenses_delete_scoped ON public.expenses;

CREATE POLICY expenses_select_scoped ON public.expenses
  FOR SELECT USING (
    public.get_user_role() = 'super_admin'
    OR company_id = public.get_user_company_id()
  );

CREATE POLICY expenses_insert_scoped ON public.expenses
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id()
    AND submitted_by = auth.uid()
  );

CREATE POLICY expenses_update_scoped ON public.expenses
  FOR UPDATE USING (
    public.get_user_role() IN ('super_admin','company_admin','manager')
    AND company_id = public.get_user_company_id()
  );

CREATE POLICY expenses_delete_scoped ON public.expenses
  FOR DELETE USING (
    public.get_user_role() IN ('super_admin','company_admin','manager')
    AND company_id = public.get_user_company_id()
  );

DROP POLICY IF EXISTS fleet_applications_insert_public ON public.fleet_applications;
DROP POLICY IF EXISTS fleet_applications_super_admin_select ON public.fleet_applications;
DROP POLICY IF EXISTS fleet_applications_super_admin_update ON public.fleet_applications;

CREATE POLICY fleet_applications_insert_public ON public.fleet_applications
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY fleet_applications_super_admin_select ON public.fleet_applications
  FOR SELECT USING (public.get_user_role() = 'super_admin');

CREATE POLICY fleet_applications_super_admin_update ON public.fleet_applications
  FOR UPDATE USING (public.get_user_role() = 'super_admin');

DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_fleet_applications_updated_at ON public.fleet_applications;
CREATE TRIGGER update_fleet_applications_updated_at
  BEFORE UPDATE ON public.fleet_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON public.expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_load_id ON public.expenses(load_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id ON public.expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by ON public.expenses(submitted_by);

CREATE INDEX IF NOT EXISTS idx_fleet_applications_status ON public.fleet_applications(status);
CREATE INDEX IF NOT EXISTS idx_fleet_applications_email ON public.fleet_applications(email);
CREATE INDEX IF NOT EXISTS idx_fleet_applications_country ON public.fleet_applications(country);
