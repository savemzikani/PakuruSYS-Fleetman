-- Feature toggles, ratings, payments, analytics
SET statement_timeout = 0;

CREATE TABLE IF NOT EXISTS public.feature_toggles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  enabled_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, feature_name)
);

CREATE TABLE IF NOT EXISTS public.customer_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  load_id UUID REFERENCES public.loads(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  feedback TEXT,
  service_aspects JSONB,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.load_tracking
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS public.customer_payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  payment_type VARCHAR(50) NOT NULL,
  provider VARCHAR(100),
  masked_details VARCHAR(100),
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  payment_method_id UUID REFERENCES public.customer_payment_methods(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency currency_code DEFAULT 'USD',
  transaction_reference VARCHAR(255) UNIQUE,
  gateway_reference VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  gateway_response JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daily_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_loads INTEGER DEFAULT 0,
  completed_loads INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  expenses DECIMAL(12,2) DEFAULT 0,
  active_vehicles INTEGER DEFAULT 0,
  active_drivers INTEGER DEFAULT 0,
  customer_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, date)
);

ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feature_toggles_select ON public.feature_toggles;
DROP POLICY IF EXISTS feature_toggles_manage ON public.feature_toggles;

CREATE POLICY feature_toggles_select ON public.feature_toggles
  FOR SELECT USING (
    public.get_user_role() = 'super_admin'
    OR company_id = public.get_user_company_id()
  );

CREATE POLICY feature_toggles_manage ON public.feature_toggles
  FOR ALL USING (
    public.get_user_role() IN ('super_admin','company_admin')
    AND company_id = public.get_user_company_id()
  )
  WITH CHECK (
    public.get_user_role() IN ('super_admin','company_admin')
    AND company_id = public.get_user_company_id()
  );

DROP POLICY IF EXISTS customer_ratings_select ON public.customer_ratings;
DROP POLICY IF EXISTS customer_ratings_insert ON public.customer_ratings;

CREATE POLICY customer_ratings_select ON public.customer_ratings
  FOR SELECT USING (
    public.get_user_role() = 'super_admin'
    OR company_id = public.get_user_company_id()
  );

CREATE POLICY customer_ratings_insert ON public.customer_ratings
  FOR INSERT WITH CHECK (
    customer_id IN (
      SELECT id FROM public.customers WHERE email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS load_tracking_select_scoped ON public.load_tracking;
DROP POLICY IF EXISTS load_tracking_insert_scoped ON public.load_tracking;

CREATE POLICY load_tracking_select_scoped ON public.load_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.loads
      WHERE loads.id = public.load_tracking.load_id
        AND (
          public.get_user_role() = 'super_admin'
          OR loads.company_id = public.get_user_company_id()
        )
    )
  );

CREATE POLICY load_tracking_insert_scoped ON public.load_tracking
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.loads
      WHERE loads.id = public.load_tracking.load_id
        AND loads.company_id = public.get_user_company_id()
    )
    AND updated_by = auth.uid()
  );

DROP POLICY IF EXISTS customer_payment_methods_manage ON public.customer_payment_methods;
CREATE POLICY customer_payment_methods_manage ON public.customer_payment_methods
  FOR ALL USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT id FROM public.customers WHERE email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS payment_transactions_select ON public.payment_transactions;
CREATE POLICY payment_transactions_select ON public.payment_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = public.payment_transactions.invoice_id
        AND (
          public.get_user_role() = 'super_admin'
          OR invoices.company_id = public.get_user_company_id()
        )
    )
  );

DROP POLICY IF EXISTS daily_analytics_select ON public.daily_analytics;
CREATE POLICY daily_analytics_select ON public.daily_analytics
  FOR SELECT USING (
    public.get_user_role() = 'super_admin'
    OR company_id = public.get_user_company_id()
  );

DROP TRIGGER IF EXISTS update_feature_toggles_updated_at ON public.feature_toggles;
CREATE TRIGGER update_feature_toggles_updated_at
  BEFORE UPDATE ON public.feature_toggles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_ratings_updated_at ON public.customer_ratings;
CREATE TRIGGER update_customer_ratings_updated_at
  BEFORE UPDATE ON public.customer_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_payment_methods_updated_at ON public.customer_payment_methods;
CREATE TRIGGER update_customer_payment_methods_updated_at
  BEFORE UPDATE ON public.customer_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON public.payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_feature_toggles_company_feature ON public.feature_toggles(company_id, feature_name);
CREATE INDEX IF NOT EXISTS idx_customer_ratings_company ON public.customer_ratings(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_ratings_customer ON public.customer_ratings(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_ratings_load ON public.customer_ratings(load_id);
CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_customer ON public.customer_payment_methods(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice ON public.payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_company_date ON public.daily_analytics(company_id, date);

INSERT INTO public.feature_toggles (company_id, feature_name, is_enabled)
SELECT
  companies.id,
  feature_name,
  CASE
    WHEN companies.subscription_plan = 'basic' THEN FALSE
    WHEN companies.subscription_plan = 'premium' THEN TRUE
    ELSE TRUE
  END
FROM public.companies
CROSS JOIN LATERAL (VALUES
  ('real_time_tracking'),
  ('advanced_analytics'),
  ('customer_portal'),
  ('expense_management'),
  ('document_management'),
  ('multi_currency'),
  ('mobile_app'),
  ('api_access'),
  ('custom_reports'),
  ('bulk_operations')
) AS features(feature_name)
ON CONFLICT (company_id, feature_name) DO NOTHING;
