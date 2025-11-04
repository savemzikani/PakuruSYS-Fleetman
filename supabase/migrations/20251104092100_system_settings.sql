-- System settings configuration
SET statement_timeout = 0;

CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_settings_manage ON public.system_settings;
CREATE POLICY system_settings_manage ON public.system_settings
  FOR ALL USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.system_settings (key, value)
VALUES
  ('maintenance_mode', to_jsonb(FALSE)),
  ('max_companies', to_jsonb(100)),
  ('default_currency', to_jsonb('USD'::text)),
  ('email_notifications', to_jsonb(TRUE)),
  ('auto_approve_applications', to_jsonb(FALSE))
ON CONFLICT (key) DO NOTHING;
