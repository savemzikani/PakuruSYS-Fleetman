-- Ensure users can read drivers within their company

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can view drivers" ON drivers;

CREATE POLICY "Company members can view drivers"
ON drivers
FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM profiles
    WHERE id = auth.uid()
  )
);
