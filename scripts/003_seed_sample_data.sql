-- Rebuilt seed file: companies, tenants (conditional), customers (schema-aware), vehicles (schema-aware), drivers (schema-aware)
    -- Rebuilt seed file: companies, tenants (conditional), customers (schema-aware), vehicles (schema-aware), drivers (schema-aware)

    -- Insert sample companies (idempotent)
    INSERT INTO companies (id, name, registration_number, email, phone, address, city, country, status) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'SADC Transport Solutions', 'REG001', 'admin@sadctransport.com', '+27123456789', '123 Transport Ave', 'Johannesburg', 'South Africa', 'active'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Cross Border Logistics', 'REG002', 'info@crossborder.com', '+26712345678', '456 Logistics St', 'Gaborone', 'Botswana', 'active'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Regional Freight Co', 'REG003', 'contact@regionalfreight.com', '+26412345678', '789 Freight Rd', 'Windhoek', 'Namibia', 'active')
    ON CONFLICT (id) DO NOTHING;

    -- Compatibility shim: insert tenants only when tenants table exists
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
            INSERT INTO tenants (
                id, name, contact_email, company_name, contact_phone, address, city, country, subscription_plan, subscription_status
            ) VALUES
            ('550e8400-e29b-41d4-a716-446655440001', 'SADC Transport Solutions', 'admin@sadctransport.com', 'SADC Transport Solutions', '+27123456789', '123 Transport Ave', 'Johannesburg', 'South Africa', 'trial', 'trial'),
            ('550e8400-e29b-41d4-a716-446655440002', 'Cross Border Logistics', 'info@crossborder.com', 'Cross Border Logistics', '+26712345678', '456 Logistics St', 'Gaborone', 'Botswana', 'trial', 'trial'),
            ('550e8400-e29b-41d4-a716-446655440003', 'Regional Freight Co', 'contact@regionalfreight.com', 'Regional Freight Co', '+26412345678', '789 Freight Rd', 'Windhoek', 'Namibia', 'trial', 'trial')
            ON CONFLICT (id) DO NOTHING;
        END IF;
    END$$;

    -- Insert sample customers (schema-aware: handle tenant_id presence)
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tenant_id') THEN
            INSERT INTO customers (tenant_id, company_id, name, contact_person, email, phone, address, city, country, credit_limit) VALUES
            ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Mining Corp Ltd', 'John Smith', 'john@miningcorp.com', '+27987654321', '100 Mine St', 'Cape Town', 'South Africa', 50000.00),
            ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Agricultural Exports', 'Jane Doe', 'jane@agriexports.com', '+27876543210', '200 Farm Rd', 'Durban', 'South Africa', 75000.00),
            ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Diamond Trading Co', 'Mike Johnson', 'mike@diamonds.com', '+26798765432', '300 Diamond Ave', 'Francistown', 'Botswana', 100000.00);
        ELSE
            INSERT INTO customers (company_id, name, contact_person, email, phone, address, city, country, credit_limit) VALUES
            ('550e8400-e29b-41d4-a716-446655440001', 'Mining Corp Ltd', 'John Smith', 'john@miningcorp.com', '+27987654321', '100 Mine St', 'Cape Town', 'South Africa', 50000.00),
            ('550e8400-e29b-41d4-a716-446655440001', 'Agricultural Exports', 'Jane Doe', 'jane@agriexports.com', '+27876543210', '200 Farm Rd', 'Durban', 'South Africa', 75000.00),
            ('550e8400-e29b-41d4-a716-446655440002', 'Diamond Trading Co', 'Mike Johnson', 'mike@diamonds.com', '+26798765432', '300 Diamond Ave', 'Francistown', 'Botswana', 100000.00);
        END IF;
    END$$;

    -- Insert sample vehicles (schema-aware)
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'vehicles' AND column_name = 'tenant_id'
        ) THEN
            INSERT INTO vehicles (tenant_id, company_id, registration_number, make, model, year, capacity_tons, status) VALUES
            ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'GP123ABC', 'Volvo', 'FH16', 2020, 30.0, 'active'),
            ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'GP456DEF', 'Scania', 'R450', 2019, 28.0, 'active'),
            ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'BW789GHI', 'Mercedes', 'Actros', 2021, 32.0, 'active'),
            ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'NA321JKL', 'MAN', 'TGX', 2018, 25.0, 'maintenance')
            ON CONFLICT (company_id, registration_number) DO NOTHING;
        ELSE
            INSERT INTO vehicles (company_id, registration_number, make, model, year, capacity_tons, status) VALUES
            ('550e8400-e29b-41d4-a716-446655440001', 'GP123ABC', 'Volvo', 'FH16', 2020, 30.0, 'active'),
            ('550e8400-e29b-41d4-a716-446655440001', 'GP456DEF', 'Scania', 'R450', 2019, 28.0, 'active'),
            ('550e8400-e29b-41d4-a716-446655440002', 'BW789GHI', 'Mercedes', 'Actros', 2021, 32.0, 'active'),
            ('550e8400-e29b-41d4-a716-446655440003', 'NA321JKL', 'MAN', 'TGX', 2018, 25.0, 'maintenance')
            ON CONFLICT (company_id, registration_number) DO NOTHING;
        END IF;
    END$$;

    -- Insert sample drivers (schema-aware, derive address/city/state from companies)
    DO $$
    DECLARE
        has_tenant    BOOLEAN := EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'tenant_id');
        has_full      BOOLEAN := EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'full_name');
        has_address1  BOOLEAN := EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'address_line1');
        has_city      BOOLEAN := EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'city');
        has_state     BOOLEAN := EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'state');

        cols text[] := ARRAY[]::text[];
        cols_sql text;
        values_sql text := '';
        r integer := 0;
        rec record;

        -- sample static arrays for names/licenses/contacts
        s_full text[] := ARRAY['David Wilson','Sarah Brown','Peter Jones','Lisa Miller'];
        s_first text[] := ARRAY['David','Sarah','Peter','Lisa'];
        s_last text[] := ARRAY['Wilson','Brown','Jones','Miller'];
        s_license text[] := ARRAY['DL001234','DL005678','DL009876','DL543210'];
        s_expiry text[] := ARRAY['2025-12-31','2026-06-30','2025-09-15','2026-03-20'];
        s_phone text[] := ARRAY['+27765432109','+27654321098','+26787654321','+26476543210'];
        s_email text[] := ARRAY['david@sadctransport.com','sarah@sadctransport.com','peter@crossborder.com','lisa@regionalfreight.com'];

        row_items text[];
        c text;
    BEGIN
        -- Build column list according to available columns
        IF has_tenant THEN
            cols := array_append(cols, 'tenant_id');
        END IF;
        cols := array_append(cols, 'company_id');
        IF has_full THEN
            cols := array_append(cols, 'full_name');
        ELSE
            cols := cols || ARRAY['first_name', 'last_name'];
        END IF;
        cols := cols || ARRAY['license_number', 'license_expiry', 'phone', 'email'];
        IF has_address1 THEN
            cols := array_append(cols, 'address_line1');
        END IF;
        IF has_city THEN
            cols := array_append(cols, 'city');
        END IF;
        IF has_state THEN
            cols := array_append(cols, 'state');
        END IF;

    cols_sql := array_to_string(cols, ', ');

    -- Debug: show computed columns (helps verify the running script is the updated version)
    RAISE NOTICE 'DEBUG: drivers will insert into columns: %', cols_sql;

        -- Iterate companies we inserted earlier to derive address/city/state
        FOR rec IN
            SELECT id, address, city,
                CASE city
                    WHEN 'Johannesburg' THEN 'Gauteng'
                    WHEN 'Gaborone' THEN 'Gaborone'
                    WHEN 'Windhoek' THEN 'Khomas'
                    ELSE NULL
                END AS state
            FROM companies
            WHERE id IN (
                '550e8400-e29b-41d4-a716-446655440001',
                '550e8400-e29b-41d4-a716-446655440002',
                '550e8400-e29b-41d4-a716-446655440003'
            )
            ORDER BY id
        LOOP
            r := r + 1;
            row_items := ARRAY[]::text[];
            FOREACH c IN ARRAY cols LOOP
                CASE c
                    WHEN 'tenant_id' THEN row_items := row_items || quote_literal(rec.id::text);
                    WHEN 'company_id' THEN row_items := row_items || quote_literal(rec.id::text);
                    WHEN 'full_name' THEN row_items := row_items || quote_literal(s_full[LEAST(r, array_length(s_full,1))]);
                    WHEN 'first_name' THEN row_items := row_items || quote_literal(s_first[LEAST(r, array_length(s_first,1))]);
                    WHEN 'last_name' THEN row_items := row_items || quote_literal(s_last[LEAST(r, array_length(s_last,1))]);
                    WHEN 'license_number' THEN row_items := row_items || quote_literal(s_license[LEAST(r, array_length(s_license,1))]);
                    WHEN 'license_expiry' THEN row_items := row_items || quote_literal(s_expiry[LEAST(r, array_length(s_expiry,1))]);
                    WHEN 'phone' THEN row_items := row_items || quote_literal(s_phone[LEAST(r, array_length(s_phone,1))]);
                    WHEN 'email' THEN row_items := row_items || quote_literal(s_email[LEAST(r, array_length(s_email,1))]);
                    WHEN 'address_line1' THEN row_items := row_items || quote_literal(rec.address);
                    WHEN 'city' THEN row_items := row_items || quote_literal(rec.city);
                    WHEN 'state' THEN row_items := row_items || quote_literal(rec.state);
                    ELSE row_items := row_items || 'NULL';
                END CASE;
            END LOOP;

            values_sql := values_sql || '(' || array_to_string(row_items, ',') || '),' ;
        END LOOP;

        -- Trim trailing comma and execute if we have values
        IF values_sql <> '' THEN
            values_sql := substring(values_sql FROM 1 FOR char_length(values_sql) - 1);
            -- Debug: show the exact INSERT about to be executed (useful when running interactively)
            RAISE NOTICE 'DEBUG: drivers INSERT SQL: %', format('INSERT INTO drivers (%s) VALUES %s', cols_sql, values_sql);
            EXECUTE format('INSERT INTO drivers (%s) VALUES %s', cols_sql, values_sql);
        END IF;
    END$$;

    -- Insert sample auth.users and profiles (with company/role assignments)
    DO $$
    DECLARE
        super_admin_id UUID;
        sadc_admin_id UUID;
        driver_id UUID;
        customer_id UUID;
        role_enum_values text;
    BEGIN
        -- Get the enum values to debug what roles are allowed
        SELECT string_agg(e.enumlabel, ', ') INTO role_enum_values
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role';
        
        RAISE NOTICE 'Available user_role values: %', role_enum_values;

        -- Only proceed if auth schema exists (we're in Supabase)
        IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
            -- Create users and profiles one by one to ensure proper role handling
            
            -- Query type definition to see available role values
            SELECT string_agg(e.enumlabel, ', ') INTO role_enum_values
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'user_role';
            
            RAISE NOTICE 'Creating users with the following available roles: %', role_enum_values;
            
            -- 1. Super Admin
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
            VALUES (
                'bf4e5af0-49b8-40fb-883e-015ceb5a863d',
                'savemzikani@proton.me',
                crypt('Admin123', gen_salt('bf')),
                NOW(), NOW(), NOW(),
                '{"provider":"email","providers":["email"]}',
                '{"role": "super_admin", "name": "Super Admin", "first_name": "Super", "last_name": "Admin"}',
                true
            ) ON CONFLICT (id) DO NOTHING;
            
            -- Rely on auth.users trigger to create the profiles row. In many Supabase setups
            -- the trigger will populate `public.profiles` from `auth.users.raw_user_meta_data`.
            -- Skipping explicit profile INSERT to avoid constraint/policy mismatches.

            -- 2. Company Admin
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
            VALUES (
                '550e8400-e29b-41d4-a716-446655440011',
                'admin@sadctransport.com',
                crypt('Welcome123!', gen_salt('bf')),
                NOW(), NOW(), NOW(),
                '{"provider":"email","providers":["email"]}',
                '{"role": "company_admin", "name": "SADC Admin", "first_name": "SADC", "last_name": "Admin", "company_id": "550e8400-e29b-41d4-a716-446655440001"}',
                false
            ) ON CONFLICT (id) DO NOTHING;
            
            -- (profile created by auth trigger)

            -- 3. Driver
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
            VALUES (
                '550e8400-e29b-41d4-a716-446655440012',
                'david@sadctransport.com',
                crypt('Welcome123!', gen_salt('bf')),
                NOW(), NOW(), NOW(),
                '{"provider":"email","providers":["email"]}',
                '{"role": "driver", "name": "David Wilson", "first_name": "David", "last_name": "Wilson", "company_id": "550e8400-e29b-41d4-a716-446655440001"}',
                false
            ) ON CONFLICT (id) DO NOTHING;
            
            -- (profile created by auth trigger)

            -- 4. Customer
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
            VALUES (
                '550e8400-e29b-41d4-a716-446655440013',
                'john@miningcorp.com',
                crypt('Welcome123!', gen_salt('bf')),
                NOW(), NOW(), NOW(),
                '{"provider":"email","providers":["email"]}',
                '{"role": "customer", "name": "John Smith", "first_name": "John", "last_name": "Smith", "company_id": "550e8400-e29b-41d4-a716-446655440002"}',
                false
            ) ON CONFLICT (id) DO NOTHING;
            
            -- (profile created by auth trigger)

            -- Show created users and available roles
            RAISE NOTICE 'Created test users with password: Welcome123!';
            RAISE NOTICE 'User roles setup with enum values: %', role_enum_values;
        END IF;
    END$$;
