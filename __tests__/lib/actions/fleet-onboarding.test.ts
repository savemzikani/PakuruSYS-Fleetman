import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  getFleetApplications,
  approveFleetApplication,
  rejectFleetApplication,
} from '@/lib/actions/fleet-onboarding'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('next/cache')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>

describe('Fleet Onboarding Actions', () => {
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
      update: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      or: jest.fn(() => mockSupabase),
      order: jest.fn(() => mockSupabase),
      single: jest.fn(),
    }

    mockCreateClient.mockResolvedValue(mockSupabase)
  })

  describe('getFleetApplications', () => {
    it('should fetch fleet applications successfully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockApplications = [
        {
          id: 'app-1',
          company_name: 'Test Fleet Co',
          status: 'pending',
          submitted_at: '2024-01-15T10:00:00Z',
          reviewed_by_profile: null,
        },
        {
          id: 'app-2',
          company_name: 'Another Fleet',
          status: 'approved',
          submitted_at: '2024-01-14T15:30:00Z',
          reviewed_by_profile: { first_name: 'Admin', last_name: 'User' },
        },
      ]

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.order.mockResolvedValue({ data: mockApplications, error: null })

      const result = await getFleetApplications()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockApplications)
      expect(mockSupabase.from).toHaveBeenCalledWith('fleet_applications')
      expect(mockSupabase.order).toHaveBeenCalledWith('submitted_at', { ascending: false })
    })

    it('should apply status filter correctly', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockApplications = [
        {
          id: 'app-1',
          company_name: 'Test Fleet Co',
          status: 'pending',
          submitted_at: '2024-01-15T10:00:00Z',
        },
      ]

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.order.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockResolvedValue({ data: mockApplications, error: null })

      const result = await getFleetApplications({ status: 'pending' })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockApplications)
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'pending')
    })

    it('should apply search filter correctly', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockApplications = [
        {
          id: 'app-1',
          company_name: 'Test Fleet Co',
          status: 'pending',
          submitted_at: '2024-01-15T10:00:00Z',
        },
      ]

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.order.mockReturnValue(mockSupabase)
      mockSupabase.or.mockResolvedValue({ data: mockApplications, error: null })

      const result = await getFleetApplications({ search: 'Test Fleet' })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockApplications)
      expect(mockSupabase.or).toHaveBeenCalledWith('company_name.ilike.%Test Fleet%,contact_person.ilike.%Test Fleet%,email.ilike.%Test Fleet%')
    })

    it('should return error when user is not super admin', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'company_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })

      const result = await getFleetApplications()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Super admin access required')
    })

    it('should return error when user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await getFleetApplications()

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('should handle database errors gracefully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.order.mockResolvedValue({ data: null, error: new Error('Database error') })

      const result = await getFleetApplications()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('approveFleetApplication', () => {
    it('should approve fleet application successfully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockApplication = {
        id: 'app-1',
        company_name: 'Test Fleet Co',
        email: 'admin@testfleet.com',
        phone: '+1234567890',
        address: '123 Main St',
        city: 'Test City',
        country: 'Test Country',
        postal_code: '12345',
        tax_number: 'TAX123',
        business_license: 'BL123',
        contact_person: 'John Doe',
        status: 'pending',
      }
      const mockCompany = { id: 'company-1', name: 'Test Fleet Co' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockApplication })
      mockSupabase.insert.mockResolvedValueOnce({ data: mockCompany, error: null })
      mockSupabase.update.mockResolvedValue({ error: null })

      const result = await approveFleetApplication('app-1', 'Application looks good')

      expect(result.success).toBe(true)
      expect(result.message).toContain('Fleet application approved')
      expect(mockSupabase.from).toHaveBeenCalledWith('companies')
      expect(mockSupabase.from).toHaveBeenCalledWith('fleet_applications')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/applications')
    })

    it('should return error when user is not super admin', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'company_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })

      const result = await approveFleetApplication('app-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Super admin access required')
    })

    it('should return error when application not found', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: null })

      const result = await approveFleetApplication('app-999')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Application not found or already processed')
    })

    it('should handle company creation errors', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockApplication = {
        id: 'app-1',
        company_name: 'Test Fleet Co',
        email: 'admin@testfleet.com',
        status: 'pending',
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockApplication })
      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: new Error('Company creation failed') })

      const result = await approveFleetApplication('app-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Company creation failed')
    })
  })

  describe('rejectFleetApplication', () => {
    it('should reject fleet application successfully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockApplication = {
        id: 'app-1',
        company_name: 'Test Fleet Co',
        status: 'pending',
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockApplication })
      mockSupabase.update.mockResolvedValue({ error: null })

      const result = await rejectFleetApplication('app-1', 'Incomplete documentation')

      expect(result.success).toBe(true)
      expect(result.message).toContain('Fleet application rejected')
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'rejected',
        reviewed_at: expect.any(String),
        reviewed_by: 'user-1',
        rejection_reason: 'Incomplete documentation',
      })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/applications')
    })

    it('should return error when user is not super admin', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'company_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })

      const result = await rejectFleetApplication('app-1', 'Test reason')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Super admin access required')
    })

    it('should return error when application not found', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: null })

      const result = await rejectFleetApplication('app-999', 'Test reason')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Application not found or already processed')
    })

    it('should handle database update errors', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockApplication = {
        id: 'app-1',
        company_name: 'Test Fleet Co',
        status: 'pending',
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockApplication })
      mockSupabase.update.mockResolvedValue({ error: new Error('Update failed') })

      const result = await rejectFleetApplication('app-1', 'Test reason')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
    })
  })
})