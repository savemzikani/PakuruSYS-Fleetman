-- Create test company admin user for testing purposes
-- This script creates a company and a company admin user for testing login and permissions

-- First, ensure we have a test company
INSERT INTO companies (
  id,
  name,
  email,
  phone,
  address,
  city,
  country,
  status,
  created_at,
  updated_at
) VALUES (
  'test-company-001',
  'Test Logistics Company',
  'taona@testlogistics.com',
  '+27 11 123 4567',
  '123 Test Street, Business District',
  'Johannesburg',
  'South Africa',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  updated_at = NOW();

-- Create a test company admin profile
-- Note: In a real system, this would be linked to an auth user
-- For testing, we'll create a profile that can be used with manual auth setup
INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  phone,
  role,
  company_id,
  created_at,
  updated_at
) VALUES (
  'test-admin-001',
  'tmberi52@gmail.com',
  'John',
  'Admin',
  '+27 82 123 4567',
  'company_admin',
  'test-company-001',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  company_id = EXCLUDED.company_id,
  updated_at = NOW();

-- Create some test data for the company
-- Add a few test vehicles
INSERT INTO vehicles (
  id,
  company_id,
  license_plate,
  make,
  model,
  year,
  capacity_tons,
  fuel_type,
  status,
  created_at,
  updated_at
) VALUES 
(
  'test-vehicle-001',
  'test-company-001',
  'ABC 123 GP',
  'Volvo',
  'FH16',
  2022,
  40.0,
  'diesel',
  'active',
  NOW(),
  NOW()
),
(
  'test-vehicle-002',
  'test-company-001',
  'DEF 456 ZN',
  'Mercedes-Benz',
  'Actros',
  2021,
  35.0,
  'diesel',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  license_plate = EXCLUDED.license_plate,
  make = EXCLUDED.make,
  model = EXCLUDED.model,
  updated_at = NOW();

-- Add a test driver
INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  phone,
  role,
  company_id,
  created_at,
  updated_at
) VALUES (
  'test-driver-001',
  'driver@testlogistics.com',
  'Mike',
  'Driver',
  '+27 83 987 6543',
  'driver',
  'test-company-001',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  company_id = EXCLUDED.company_id,
  updated_at = NOW();

-- Add a test customer
INSERT INTO customers (
  id,
  company_id,
  name,
  email,
  phone,
  address,
  city,
  country,
  status,
  created_at,
  updated_at
) VALUES (
  'test-customer-001',
  'test-company-001',
  'ABC Manufacturing',
  'orders@abcmanufacturing.com',
  '+27 11 987 6543',
  '456 Industrial Avenue',
  'Cape Town',
  'South Africa',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  updated_at = NOW();

-- Add a test load
INSERT INTO loads (
  id,
  company_id,
  customer_id,
  reference_number,
  pickup_location,
  delivery_location,
  pickup_date,
  delivery_date,
  cargo_description,
  weight_tons,
  value_usd,
  status,
  created_at,
  updated_at
) VALUES (
  'test-load-001',
  'test-company-001',
  'test-customer-001',
  'TL-2024-001',
  'Johannesburg, South Africa',
  'Cape Town, South Africa',
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '3 days',
  'Industrial Equipment',
  25.5,
  50000.00,
  'pending',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  reference_number = EXCLUDED.reference_number,
  pickup_location = EXCLUDED.pickup_location,
  delivery_location = EXCLUDED.delivery_location,
  updated_at = NOW();

-- Output success message
DO $$
BEGIN
  RAISE NOTICE 'Test company admin user created successfully!';
  RAISE NOTICE 'Company: Test Logistics Company (ID: test-company-001)';
  RAISE NOTICE 'Admin User: John Admin (admin@testlogistics.com)';
  RAISE NOTICE 'Profile ID: test-admin-001';
  RAISE NOTICE '';
  RAISE NOTICE 'To use this for testing:';
  RAISE NOTICE '1. Create an auth user with email: admin@testlogistics.com';
  RAISE NOTICE '2. Update the profiles table to link the auth user ID';
  RAISE NOTICE '3. Or use the profile ID directly for testing purposes';
END $$;
