import { createClient } from '@supabase/supabase-js'

// Test database configuration
const supabaseUrl = process.env.TEST_SUPABASE_URL || 'https://test.supabase.co'
const supabaseKey = process.env.TEST_SUPABASE_ANON_KEY || 'test-key'

export const testDb = createClient(supabaseUrl, supabaseKey)

// Test data factories
export const createTestCompany = async (overrides = {}) => {
  const defaultCompany = {
    id: `test-company-${Date.now()}`,
    name: 'Test Logistics Company',
    email: 'test@company.com',
    phone: '+27 11 123 4567',
    address: '123 Test Street',
    city: 'Johannesburg',
    country: 'South Africa',
    status: 'active',
    ...overrides,
  }

  const { data, error } = await testDb
    .from('companies')
    .insert(defaultCompany)
    .select()
    .single()

  if (error) throw error
  return data
}

export const createTestUser = async (companyId: string, overrides = {}) => {
  const defaultUser = {
    id: `test-user-${Date.now()}`,
    email: 'test@user.com',
    first_name: 'Test',
    last_name: 'User',
    phone: '+27 82 123 4567',
    role: 'company_admin',
    company_id: companyId,
    ...overrides,
  }

  const { data, error } = await testDb
    .from('profiles')
    .insert(defaultUser)
    .select()
    .single()

  if (error) throw error
  return data
}

export const createTestCustomer = async (companyId: string, overrides = {}) => {
  const defaultCustomer = {
    id: `test-customer-${Date.now()}`,
    company_id: companyId,
    name: 'Test Customer',
    email: 'customer@test.com',
    phone: '+27 11 987 6543',
    address: '456 Customer Street',
    city: 'Cape Town',
    country: 'South Africa',
    status: 'active',
    ...overrides,
  }

  const { data, error } = await testDb
    .from('customers')
    .insert(defaultCustomer)
    .select()
    .single()

  if (error) throw error
  return data
}

export const createTestVehicle = async (companyId: string, overrides = {}) => {
  const defaultVehicle = {
    id: `test-vehicle-${Date.now()}`,
    company_id: companyId,
    license_plate: `TEST-${Math.random().toString(36).substr(2, 6)}`,
    make: 'Volvo',
    model: 'FH16',
    year: 2022,
    capacity_tons: 40.0,
    fuel_type: 'diesel',
    status: 'active',
    ...overrides,
  }

  const { data, error } = await testDb
    .from('vehicles')
    .insert(defaultVehicle)
    .select()
    .single()

  if (error) throw error
  return data
}

export const createTestLoad = async (companyId: string, customerId: string, overrides = {}) => {
  const defaultLoad = {
    id: `test-load-${Date.now()}`,
    company_id: companyId,
    customer_id: customerId,
    reference_number: `TL-TEST-${Date.now()}`,
    pickup_location: 'Johannesburg, South Africa',
    delivery_location: 'Cape Town, South Africa',
    pickup_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    delivery_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    cargo_description: 'Test cargo',
    weight_tons: 25.5,
    value_usd: 50000.00,
    status: 'pending',
    ...overrides,
  }

  const { data, error } = await testDb
    .from('loads')
    .insert(defaultLoad)
    .select()
    .single()

  if (error) throw error
  return data
}

// Cleanup utilities
export const cleanupTestData = async () => {
  // Delete test data in reverse dependency order
  await testDb.from('loads').delete().like('id', 'test-load-%')
  await testDb.from('vehicles').delete().like('id', 'test-vehicle-%')
  await testDb.from('customers').delete().like('id', 'test-customer-%')
  await testDb.from('profiles').delete().like('id', 'test-user-%')
  await testDb.from('companies').delete().like('id', 'test-company-%')
}

// Test setup and teardown
export const setupTestEnvironment = async () => {
  // Create a test company and admin user
  const company = await createTestCompany()
  const user = await createTestUser(company.id)
  
  return { company, user }
}

export const teardownTestEnvironment = async () => {
  await cleanupTestData()
}