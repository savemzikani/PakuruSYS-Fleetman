-- Seed data for Supabase-managed database
SET statement_timeout = 0;

BEGIN;

-- Companies
INSERT INTO public.companies (
  id,
  name,
  registration_number,
  email,
  phone,
  address,
  city,
  country,
  status,
  subscription_plan
) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'SADC Transport Solutions',
    'REG001',
    'admin@sadctransport.com',
    '+27123456789',
    '123 Transport Ave',
    'Johannesburg',
    'South Africa',
    'active',
    'premium'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'Cross Border Logistics',
    'REG002',
    'info@crossborder.com',
    '+26712345678',
    '456 Logistics St',
    'Gaborone',
    'Botswana',
    'active',
    'standard'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'Regional Freight Co',
    'REG003',
    'contact@regionalfreight.com',
    '+26412345678',
    '789 Freight Rd',
    'Windhoek',
    'Namibia',
    'active',
    'standard'
  )
ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    registration_number = EXCLUDED.registration_number,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    country = EXCLUDED.country,
    status = EXCLUDED.status,
    subscription_plan = EXCLUDED.subscription_plan,
    updated_at = timezone('utc'::text, now());

-- Customers
INSERT INTO public.customers (
  id,
  company_id,
  name,
  email,
  phone,
  address,
  city,
  country
) VALUES
  (
    '11111111-2222-4333-8444-555555555550',
    '550e8400-e29b-41d4-a716-446655440001',
    'Mining Corp Ltd',
    'john@miningcorp.com',
    '+27987654321',
    '100 Mine St',
    'Cape Town',
    'South Africa'
  ),
  (
    '11111111-2222-4333-8444-555555555551',
    '550e8400-e29b-41d4-a716-446655440001',
    'Agricultural Exports',
    'jane@agriexports.com',
    '+27876543210',
    '200 Farm Rd',
    'Durban',
    'South Africa'
  ),
  (
    '11111111-2222-4333-8444-555555555552',
    '550e8400-e29b-41d4-a716-446655440002',
    'Diamond Trading Co',
    'mike@diamonds.com',
    '+26798765432',
    '300 Diamond Ave',
    'Francistown',
    'Botswana'
  )
ON CONFLICT (id) DO UPDATE
  SET
    company_id = EXCLUDED.company_id,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    country = EXCLUDED.country,
    updated_at = timezone('utc'::text, now());

-- Vehicles
INSERT INTO public.vehicles (
  id,
  company_id,
  registration_number,
  make,
  model,
  year,
  capacity_tons,
  fuel_type,
  status
) VALUES
  (
    '22222222-3333-4444-8555-666666666660',
    '550e8400-e29b-41d4-a716-446655440001',
    'GP123ABC',
    'Volvo',
    'FH16',
    2020,
    30.0,
    'diesel',
    'active'
  ),
  (
    '22222222-3333-4444-8555-666666666661',
    '550e8400-e29b-41d4-a716-446655440001',
    'GP456DEF',
    'Scania',
    'R450',
    2019,
    28.0,
    'diesel',
    'active'
  ),
  (
    '22222222-3333-4444-8555-666666666662',
    '550e8400-e29b-41d4-a716-446655440002',
    'BW789GHI',
    'Mercedes-Benz',
    'Actros',
    2021,
    32.0,
    'diesel',
    'active'
  ),
  (
    '22222222-3333-4444-8555-666666666663',
    '550e8400-e29b-41d4-a716-446655440003',
    'NA321JKL',
    'MAN',
    'TGX',
    2018,
    25.0,
    'diesel',
    'maintenance'
  )
ON CONFLICT (id) DO UPDATE
  SET
    company_id = EXCLUDED.company_id,
    registration_number = EXCLUDED.registration_number,
    make = EXCLUDED.make,
    model = EXCLUDED.model,
    year = EXCLUDED.year,
    capacity_tons = EXCLUDED.capacity_tons,
    fuel_type = EXCLUDED.fuel_type,
    status = EXCLUDED.status,
    updated_at = timezone('utc'::text, now());

-- Seeded users (profiles will be created by the auth trigger)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  email_change_token_current,
  email_change_token_new,
  email_change,
  recovery_token,
  phone,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'bf4e5af0-49b8-40fb-883e-015ceb5a863d',
    'authenticated',
    'authenticated',
    'savemzikani@proton.me',
    crypt('Admin123', gen_salt('bf')),
    timezone('utc'::text, now()),
    '',
    '',
    '',
    '',
    '',
    NULL,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"super_admin","first_name":"Super","last_name":"Admin"}'::jsonb,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '550e8400-e29b-41d4-a716-446655440011',
    'authenticated',
    'authenticated',
    'admin@sadctransport.com',
    crypt('Welcome123!', gen_salt('bf')),
    timezone('utc'::text, now()),
    '',
    '',
    '',
    '',
    '',
    NULL,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"company_admin","first_name":"SADC","last_name":"Admin","company_id":"550e8400-e29b-41d4-a716-446655440001"}'::jsonb,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '550e8400-e29b-41d4-a716-446655440012',
    'authenticated',
    'authenticated',
    'david@sadctransport.com',
    crypt('Welcome123!', gen_salt('bf')),
    timezone('utc'::text, now()),
    '',
    '',
    '',
    '',
    '',
    NULL,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"driver","first_name":"David","last_name":"Wilson","company_id":"550e8400-e29b-41d4-a716-446655440001"}'::jsonb,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '550e8400-e29b-41d4-a716-446655440013',
    'authenticated',
    'authenticated',
    'john@miningcorp.com',
    crypt('Welcome123!', gen_salt('bf')),
    timezone('utc'::text, now()),
    '',
    '',
    '',
    '',
    '',
    NULL,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"customer","first_name":"John","last_name":"Smith","company_id":"550e8400-e29b-41d4-a716-446655440002"}'::jsonb,
    false
  )
ON CONFLICT (id) DO UPDATE
  SET
    instance_id = EXCLUDED.instance_id,
    aud = EXCLUDED.aud,
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    is_super_admin = EXCLUDED.is_super_admin,
    updated_at = EXCLUDED.updated_at;

-- Ensure associated auth identities exist for password sign-in
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  (
    'bf4e5af0-49b8-40fb-883e-015ceb5a863d',
    'bf4e5af0-49b8-40fb-883e-015ceb5a863d',
    jsonb_build_object('sub', 'bf4e5af0-49b8-40fb-883e-015ceb5a863d', 'email', 'savemzikani@proton.me'),
    'email',
    'savemzikani@proton.me',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  ),
  (
    '550e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440011',
    jsonb_build_object('sub', '550e8400-e29b-41d4-a716-446655440011', 'email', 'admin@sadctransport.com'),
    'email',
    'admin@sadctransport.com',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  ),
  (
    '550e8400-e29b-41d4-a716-446655440012',
    '550e8400-e29b-41d4-a716-446655440012',
    jsonb_build_object('sub', '550e8400-e29b-41d4-a716-446655440012', 'email', 'david@sadctransport.com'),
    'email',
    'david@sadctransport.com',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  ),
  (
    '550e8400-e29b-41d4-a716-446655440013',
    '550e8400-e29b-41d4-a716-446655440013',
    jsonb_build_object('sub', '550e8400-e29b-41d4-a716-446655440013', 'email', 'john@miningcorp.com'),
    'email',
    'john@miningcorp.com',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
ON CONFLICT (id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data,
    provider = EXCLUDED.provider,
    provider_id = EXCLUDED.provider_id,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

-- Activate and enrich profiles created by the trigger
WITH seeded_profiles AS (
  SELECT * FROM (VALUES
    (
      'bf4e5af0-49b8-40fb-883e-015ceb5a863d'::uuid,
      'Super',
      'Admin',
      'super_admin',
      NULL::uuid,
      NULL::uuid,
      '+27100000000'
    ),
    (
      '550e8400-e29b-41d4-a716-446655440011'::uuid,
      'SADC',
      'Admin',
      'company_admin',
      '550e8400-e29b-41d4-a716-446655440001'::uuid,
      NULL::uuid,
      '+27123456789'
    ),
    (
      '550e8400-e29b-41d4-a716-446655440012'::uuid,
      'David',
      'Wilson',
      'driver',
      '550e8400-e29b-41d4-a716-446655440001'::uuid,
      NULL::uuid,
      '+27765432109'
    ),
    (
      '550e8400-e29b-41d4-a716-446655440013'::uuid,
      'John',
      'Smith',
      'customer',
      '550e8400-e29b-41d4-a716-446655440002'::uuid,
      '11111111-2222-4333-8444-555555555550'::uuid,
      '+26798765432'
    )
  ) AS t(id, first_name, last_name, role_label, company_id, customer_id, phone)
)
UPDATE public.profiles AS p
SET
  first_name = sp.first_name,
  last_name = sp.last_name,
  role = sp.role_label::public.user_role,
  company_id = sp.company_id,
  customer_id = sp.customer_id,
  phone = sp.phone,
  is_active = TRUE,
  updated_at = timezone('utc'::text, now())
FROM seeded_profiles AS sp
WHERE p.id = sp.id;

-- Sample invitation record
INSERT INTO public.user_invitations (
  id,
  email,
  first_name,
  last_name,
  role,
  company_id,
  invited_by,
  status
) VALUES (
  '33333333-4444-4777-8888-999999999990',
  'ops@sadctransport.com',
  'Operations',
  'Coordinator',
  'dispatcher',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440011',
  'pending'
)
ON CONFLICT (email, status) DO NOTHING;

COMMIT;
