-- HARD RESET and REBUILD of PakuruSYS schema based on current application code
-- WARNING: This will DROP and RECREATE tables in public schema. Run in Supabase SQL editor.

-- 0) Drop in dependency-safe order (if exist)
DO $$ BEGIN
  IF to_regclass('public.documents') IS NOT NULL THEN EXECUTE 'DROP TABLE public.documents CASCADE'; END IF;
  IF to_regclass('public.invoices') IS NOT NULL THEN EXECUTE 'DROP TABLE public.invoices CASCADE'; END IF;
  IF to_regclass('public.load_tracking') IS NOT NULL THEN EXECUTE 'DROP TABLE public.load_tracking CASCADE'; END IF;
  IF to_regclass('public.loads') IS NOT NULL THEN EXECUTE 'DROP TABLE public.loads CASCADE'; END IF;
  IF to_regclass('public.quote_items') IS NOT NULL THEN EXECUTE 'DROP TABLE public.quote_items CASCADE'; END IF;
  IF to_regclass('public.quotes') IS NOT NULL THEN EXECUTE 'DROP TABLE public.quotes CASCADE'; END IF;
  IF to_regclass('public.drivers') IS NOT NULL THEN EXECUTE 'DROP TABLE public.drivers CASCADE'; END IF;
  IF to_regclass('public.vehicles') IS NOT NULL THEN EXECUTE 'DROP TABLE public.vehicles CASCADE'; END IF;
  IF to_regclass('public.customers') IS NOT NULL THEN EXECUTE 'DROP TABLE public.customers CASCADE'; END IF;
  -- profiles references auth.users, so we do not drop it; we align its columns below
  IF to_regclass('public.companies') IS NOT NULL THEN EXECUTE 'DROP TABLE public.companies CASCADE'; END IF;
END $$;

-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2) Enums (create if missing)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin','company_admin','manager','dispatcher','driver','customer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE company_status AS ENUM ('active','inactive','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_status AS ENUM ('active','maintenance','out_of_service','retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE load_status AS ENUM ('pending','assigned','in_transit','delivered','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending','paid','overdue','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('invoice','pod','customs','permit','insurance','quote','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE currency_code AS ENUM ('USD','ZAR','BWP','NAD','SZL','LSL','MWK','ZMW','ZWL','MZN','ANG','MGA','MUR','SCR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Base tables
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100) UNIQUE,
  tax_number VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  status company_status DEFAULT 'active',
  subscription_plan VARCHAR(50) DEFAULT 'basic',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Align profiles table columns (do not drop profiles)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='company_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN company_id uuid NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='customer_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN customer_id uuid NULL;
  END IF;
  -- Basic required columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='first_name') THEN
    ALTER TABLE public.profiles ADD COLUMN first_name VARCHAR(100) DEFAULT 'User';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='last_name') THEN
    ALTER TABLE public.profiles ADD COLUMN last_name VARCHAR(100) DEFAULT 'Name';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='email') THEN
    ALTER TABLE public.profiles ADD COLUMN email VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='role') THEN
    ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'driver'::user_role;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='is_active') THEN
    ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='profiles' AND constraint_name='profiles_company_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  registration_number VARCHAR(50) NOT NULL,
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  vin VARCHAR(100),
  engine_number VARCHAR(100),
  fuel_type VARCHAR(50),
  capacity_tons DECIMAL(10,2),
  status vehicle_status DEFAULT 'active',
  insurance_expiry DATE,
  license_expiry DATE,
  last_service_date DATE,
  next_service_due DATE,
  odometer_reading INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, registration_number)
);

CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  license_number VARCHAR(100) NOT NULL,
  license_expiry DATE NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(200),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  tax_number VARCHAR(100),
  credit_limit DECIMAL(15,2) DEFAULT 0,
  payment_terms INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  load_number VARCHAR(100) NOT NULL,
  description TEXT,
  weight_kg DECIMAL(10,2),
  volume_m3 DECIMAL(10,2),
  pickup_address TEXT NOT NULL,
  pickup_city VARCHAR(100),
  pickup_state VARCHAR(100),
  pickup_country VARCHAR(100),
  pickup_date TIMESTAMP WITH TIME ZONE,
  delivery_address TEXT NOT NULL,
  delivery_city VARCHAR(100),
  delivery_state VARCHAR(100),
  delivery_country VARCHAR(100),
  delivery_date TIMESTAMP WITH TIME ZONE,
  status load_status DEFAULT 'pending',
  rate DECIMAL(15,2),
  currency currency_code DEFAULT 'USD',
  assigned_vehicle_id UUID REFERENCES public.vehicles(id),
  assigned_driver_id UUID REFERENCES public.drivers(id),
  dispatcher_id UUID REFERENCES public.profiles(id),
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, load_number)
);

CREATE TABLE IF NOT EXISTS public.load_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id UUID NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,
  status load_status NOT NULL,
  location TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  notes TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  load_id UUID REFERENCES public.loads(id),
  invoice_number VARCHAR(100) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  currency currency_code DEFAULT 'USD',
  status payment_status DEFAULT 'pending',
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, invoice_number)
);

-- Quotes and items (used across dashboard and portal)
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  load_id UUID REFERENCES public.loads(id),
  quote_number VARCHAR(100) NOT NULL,
  quote_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  currency currency_code DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  converted_to_invoice_id UUID REFERENCES public.invoices(id),
  notes TEXT,
  terms TEXT,
  created_by UUID REFERENCES public.profiles(id),
  sent_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, quote_number)
);

CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  line_total DECIMAL(15,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  load_id UUID REFERENCES public.loads(id),
  invoice_id UUID REFERENCES public.invoices(id),
  quote_id UUID REFERENCES public.quotes(id),
  document_type document_type NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4) RLS enabling
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 5) Minimal policies (view own company data)
DO $$ BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS companies_select ON public.companies;
  DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
END $$;

CREATE POLICY companies_select ON public.companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY profiles_self_select ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- 6) Useful indexes
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON public.vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_drivers_company_id ON public.drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_loads_company_id ON public.loads(company_id);
CREATE INDEX IF NOT EXISTS idx_loads_customer_id ON public.loads(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON public.quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON public.documents(company_id);

-- 7) updated_at trigger function and hooks
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safe trigger recreation: drop if exists, create if not exists
DO $$ 
DECLARE
  trigger_exists boolean;
BEGIN
  -- Companies trigger
  DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_companies_updated_at'
    AND tgrelid = 'public.companies'::regclass
  ) INTO trigger_exists;
  IF NOT trigger_exists THEN
    CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON public.companies 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- Profiles trigger
  DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_profiles_updated_at'
    AND tgrelid = 'public.profiles'::regclass
  ) INTO trigger_exists;
  IF NOT trigger_exists THEN
    CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- Vehicles trigger
  DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_vehicles_updated_at'
    AND tgrelid = 'public.vehicles'::regclass
  ) INTO trigger_exists;
  IF NOT trigger_exists THEN
    CREATE TRIGGER update_vehicles_updated_at 
    BEFORE UPDATE ON public.vehicles 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- Drivers trigger
  DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers;
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_drivers_updated_at'
    AND tgrelid = 'public.drivers'::regclass
  ) INTO trigger_exists;
  IF NOT trigger_exists THEN
    CREATE TRIGGER update_drivers_updated_at 
    BEFORE UPDATE ON public.drivers 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- Customers trigger
  DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_customers_updated_at'
    AND tgrelid = 'public.customers'::regclass
  ) INTO trigger_exists;
  IF NOT trigger_exists THEN
    CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON public.customers 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- Loads trigger
  DROP TRIGGER IF EXISTS update_loads_updated_at ON public.loads;
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_loads_updated_at'
    AND tgrelid = 'public.loads'::regclass
  ) INTO trigger_exists;
  IF NOT trigger_exists THEN
    CREATE TRIGGER update_loads_updated_at 
    BEFORE UPDATE ON public.loads 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- Invoices trigger
  DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_invoices_updated_at'
    AND tgrelid = 'public.invoices'::regclass
  ) INTO trigger_exists;
  IF NOT trigger_exists THEN
    CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON public.invoices 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- Quotes trigger
  DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_quotes_updated_at'
    AND tgrelid = 'public.quotes'::regclass
  ) INTO trigger_exists;
  IF NOT trigger_exists THEN
    CREATE TRIGGER update_quotes_updated_at 
    BEFORE UPDATE ON public.quotes 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;



-- 8) Ensure profiles role constraint matches current enum labels
-- This block mirrors scripts/017_fix_profiles_role_constraint.sql so a full
-- rebuild will correct any legacy constraint that uses old label text.
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


