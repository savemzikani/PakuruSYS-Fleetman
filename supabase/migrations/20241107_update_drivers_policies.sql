-- Adjust RLS policies for the drivers table to permit company managers to create driver records

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can insert drivers" ON drivers;

CREATE POLICY "Managers can insert drivers"
ON drivers
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM profiles
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'company_admin', 'manager', 'dispatcher')
  )
);
