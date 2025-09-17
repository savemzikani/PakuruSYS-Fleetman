-- Create system_settings table for super admin configuration
DO $$ 
BEGIN
    -- Create system_settings table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_settings') THEN
        CREATE TABLE public.system_settings (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            key TEXT NOT NULL UNIQUE,
            value JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
    END IF;

    -- Enable RLS
    ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies for system_settings (only super_admin can access)
    DO $policy$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'system_settings' 
            AND policyname = 'Super admins can manage system settings'
        ) THEN
            CREATE POLICY "Super admins can manage system settings" ON public.system_settings
                FOR ALL USING (
                    EXISTS (
                        SELECT 1 FROM public.profiles
                        WHERE profiles.id = auth.uid()
                        AND profiles.role = 'super_admin'
                    )
                );
        END IF;
    END $policy$;

    -- Insert default system settings
    INSERT INTO public.system_settings (key, value) VALUES
        ('maintenance_mode', 'false'),
        ('max_companies', '100'),
        ('default_currency', '"USD"'),
        ('email_notifications', 'true'),
        ('auto_approve_applications', 'false')
    ON CONFLICT (key) DO NOTHING;

END $$;
