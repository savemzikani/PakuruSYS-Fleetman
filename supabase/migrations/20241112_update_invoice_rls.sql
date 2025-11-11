-- Refresh invoice policies so authorized company roles can insert rows

DROP POLICY IF EXISTS "Managers and admins can manage invoices" ON invoices;

CREATE POLICY "Managers and admins can manage invoices" ON invoices
    FOR ALL
    USING (
        company_id IN (
            SELECT company_id
            FROM profiles
            WHERE id = auth.uid()
              AND role IN ('company_admin', 'manager', 'super_admin')
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id
            FROM profiles
            WHERE id = auth.uid()
              AND role IN ('company_admin', 'manager', 'super_admin')
        )
    );
