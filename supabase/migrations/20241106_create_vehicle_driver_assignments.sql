-- Vehicle driver assignment history table
-- Tracks which driver is assigned to a vehicle at any point in time

CREATE TABLE vehicle_driver_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    released_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one active assignment per vehicle (released_at IS NULL)
CREATE UNIQUE INDEX vehicle_driver_assignments_active_vehicle_idx
    ON vehicle_driver_assignments(vehicle_id)
    WHERE released_at IS NULL;

-- Ensure a driver cannot be double booked concurrently
CREATE UNIQUE INDEX vehicle_driver_assignments_active_driver_idx
    ON vehicle_driver_assignments(driver_id)
    WHERE released_at IS NULL;

CREATE INDEX vehicle_driver_assignments_company_idx ON vehicle_driver_assignments(company_id);
CREATE INDEX vehicle_driver_assignments_vehicle_idx ON vehicle_driver_assignments(vehicle_id);
CREATE INDEX vehicle_driver_assignments_driver_idx ON vehicle_driver_assignments(driver_id);

-- RLS policies
ALTER TABLE vehicle_driver_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view assignment history" ON vehicle_driver_assignments
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Managers and admins can manage assignments" ON vehicle_driver_assignments
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role IN ('company_admin', 'manager', 'dispatcher', 'super_admin')
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role IN ('company_admin', 'manager', 'dispatcher', 'super_admin')
        )
    );

-- Automatically maintain updated_at
CREATE TRIGGER update_vehicle_driver_assignments_updated_at
    BEFORE UPDATE ON vehicle_driver_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
