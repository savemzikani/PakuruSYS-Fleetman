-- Company security settings
-- Stores organization-wide authentication policy toggles

CREATE TABLE company_security_settings (
    company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    require_mfa BOOLEAN NOT NULL DEFAULT FALSE,
    password_rotation_days INTEGER NOT NULL DEFAULT 0,
    idle_timeout_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE company_security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view security settings" ON company_security_settings
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Authorized roles can upsert security settings" ON company_security_settings
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid() AND role IN ('company_admin', 'manager')
        )
    ) WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid() AND role IN ('company_admin', 'manager')
        )
    );

CREATE TRIGGER set_company_security_settings_updated_at
    BEFORE UPDATE ON company_security_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
