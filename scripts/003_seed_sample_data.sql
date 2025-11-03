-- Sample data for development and testing
-- Insert sample companies
INSERT INTO companies (id, name, registration_number, email, phone, address, city, country, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'SADC Transport Solutions', 'REG001', 'admin@sadctransport.com', '+27123456789', '123 Transport Ave', 'Johannesburg', 'South Africa', 'active'),
('550e8400-e29b-41d4-a716-446655440002', 'Cross Border Logistics', 'REG002', 'info@crossborder.com', '+26712345678', '456 Logistics St', 'Gaborone', 'Botswana', 'active'),
('550e8400-e29b-41d4-a716-446655440003', 'Regional Freight Co', 'REG003', 'contact@regionalfreight.com', '+26412345678', '789 Freight Rd', 'Windhoek', 'Namibia', 'active');

-- Insert sample customers
INSERT INTO customers (tenant_id, name, contact_person, email, phone, address, city, country, credit_limit) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Mining Corp Ltd', 'John Smith', 'john@miningcorp.com', '+27987654321', '100 Mine St', 'Cape Town', 'South Africa', 50000.00),
('550e8400-e29b-41d4-a716-446655440001', 'Agricultural Exports', 'Jane Doe', 'jane@agriexports.com', '+27876543210', '200 Farm Rd', 'Durban', 'South Africa', 75000.00),
('550e8400-e29b-41d4-a716-446655440002', 'Diamond Trading Co', 'Mike Johnson', 'mike@diamonds.com', '+26798765432', '300 Diamond Ave', 'Francistown', 'Botswana', 100000.00);

-- Insert sample vehicles
INSERT INTO vehicles (tenant_id, registration_number, make, model, year, capacity_tons, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'GP123ABC', 'Volvo', 'FH16', 2020, 30.0, 'active'),
('550e8400-e29b-41d4-a716-446655440001', 'GP456DEF', 'Scania', 'R450', 2019, 28.0, 'active'),
('550e8400-e29b-41d4-a716-446655440002', 'BW789GHI', 'Mercedes', 'Actros', 2021, 32.0, 'active'),
('550e8400-e29b-41d4-a716-446655440003', 'NA321JKL', 'MAN', 'TGX', 2018, 25.0, 'maintenance');

-- Insert sample drivers
INSERT INTO drivers (tenant_id, first_name, last_name, license_number, license_expiry, phone, email) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'David', 'Wilson', 'DL001234', '2025-12-31', '+27765432109', 'david@sadctransport.com'),
('550e8400-e29b-41d4-a716-446655440001', 'Sarah', 'Brown', 'DL005678', '2026-06-30', '+27654321098', 'sarah@sadctransport.com'),
('550e8400-e29b-41d4-a716-446655440002', 'Peter', 'Jones', 'DL009876', '2025-09-15', '+26787654321', 'peter@crossborder.com'),
('550e8400-e29b-41d4-a716-446655440003', 'Lisa', 'Miller', 'DL543210', '2026-03-20', '+26476543210', 'lisa@regionalfreight.com');
