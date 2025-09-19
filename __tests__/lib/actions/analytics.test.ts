import { createClient } from '@/lib/supabase/server'
import { getFleetAnalytics, generateDailyAnalytics } from '@/lib/actions/analytics'
import { getSystemAnalytics } from '@/lib/actions/super-admin'

// Mock dependencies
jest.mock('@/lib/supabase/server')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('Analytics Actions', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      insert: jest.fn(() => mockSupabase),
      upsert: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      gte: jest.fn(() => mockSupabase),
      lt: jest.fn(() => mockSupabase),
      single: jest.fn(),
    }

    mockCreateClient.mockResolvedValue(mockSupabase)
  })

  describe('getFleetAnalytics', () => {
    it('should fetch fleet analytics successfully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { company_id: 'company-1' }
      const mockVehicles = [
        { id: 'vehicle-1', registration_number: 'ABC123', status: 'active', loads: { count: 5 } },
        { id: 'vehicle-2', registration_number: 'XYZ789', status: 'maintenance', loads: { count: 3 } },
      ]
      const mockDrivers = [
        { id: 'driver-1', first_name: 'John', last_name: 'Doe', loads: { count: 8 }, completed_loads: { count: 6 } },
        { id: 'driver-2', first_name: 'Jane', last_name: 'Smith', loads: { count: 12 }, completed_loads: { count: 10 } },
      ]

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce({ data: mockVehicles })
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce({ data: mockDrivers })

      const result = await getFleetAnalytics()

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        vehicles: mockVehicles,
        drivers: mockDrivers,
      })
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.from).toHaveBeenCalledWith('vehicles')
      expect(mockSupabase.from).toHaveBeenCalledWith('drivers')
    })

    it('should return error when user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await getFleetAnalytics()

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('should return error when user not associated with company', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { company_id: null }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })

      const result = await getFleetAnalytics()

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not associated with a company')
    })

    it('should handle database errors gracefully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { company_id: 'company-1' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockRejectedValue(new Error('Database connection failed'))

      const result = await getFleetAnalytics()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
    })
  })

  describe('generateDailyAnalytics', () => {
    it('should generate daily analytics successfully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockCompanies = [
        { id: 'company-1', name: 'Test Company 1' },
        { id: 'company-2', name: 'Test Company 2' },
      ]

      // Mock all the data fetching calls
      const mockLoads = [{ id: 'load-1', status: 'delivered' }, { id: 'load-2', status: 'pending' }]
      const mockRevenue = [{ total_amount: '1000' }, { total_amount: '500' }]
      const mockExpenses = [{ amount: '200' }, { amount: '100' }]
      const mockVehicles = [{ id: 'vehicle-1' }]
      const mockDrivers = [{ id: 'driver-1' }]
      const mockCustomers = [{ id: 'customer-1' }]
      const mockRatings = [{ rating: 4.5 }, { rating: 4.0 }]

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      
      // Mock the companies query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: mockCompanies })
        })
      })

      // Mock Promise.all results for each company
      const mockPromiseAllResults = [
        { data: mockLoads },
        { data: mockRevenue },
        { data: mockExpenses },
        { data: mockVehicles },
        { data: mockDrivers },
        { data: mockCustomers },
        { data: mockRatings },
      ]

      // Mock the upsert operation
      mockSupabase.upsert = jest.fn().mockResolvedValue({ error: null })

      // Mock Promise.all
      const originalPromiseAll = Promise.all
      Promise.all = jest.fn().mockResolvedValue(mockPromiseAllResults)

      const result = await generateDailyAnalytics('2024-01-15')

      expect(result.success).toBe(true)
      expect(result.message).toBe('Daily analytics generated for 2024-01-15')

      // Restore Promise.all
      Promise.all = originalPromiseAll
    })

    it('should return error when user is not super admin', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'company_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })

      const result = await generateDailyAnalytics('2024-01-15')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Super admin access required')
    })

    it('should return error when user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await generateDailyAnalytics('2024-01-15')

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('should handle database errors during analytics generation', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockRejectedValue(new Error('Database error'))
        })
      })

      const result = await generateDailyAnalytics('2024-01-15')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })
})