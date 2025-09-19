import { createClient } from '@/lib/supabase/server'
import {
  getSystemAnalytics,
  getSystemUsers,
  updateUserRole,
  deleteUser,
} from '@/lib/actions/super-admin'

// Mock dependencies
jest.mock('@/lib/supabase/server')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('Super Admin Actions', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      update: jest.fn(() => mockSupabase),
      delete: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      ilike: jest.fn(() => mockSupabase),
      order: jest.fn(() => mockSupabase),
      range: jest.fn(() => mockSupabase),
      single: jest.fn(),
    }

    mockCreateClient.mockResolvedValue(mockSupabase)
  })

  describe('getSystemAnalytics', () => {
    it('should fetch system analytics successfully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockAnalytics = {
        totalCompanies: 25,
        totalUsers: 150,
        totalVehicles: 300,
        totalLoads: 1200,
        monthlyRevenue: 45000,
        activeDrivers: 85,
        pendingApplications: 5,
        systemHealth: 'good',
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      
      // Mock multiple database calls for analytics
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({ data: { count: 25 } }) // companies
      mockSupabase.single.mockResolvedValueOnce({ data: { count: 150 } }) // users
      mockSupabase.single.mockResolvedValueOnce({ data: { count: 300 } }) // vehicles
      mockSupabase.single.mockResolvedValueOnce({ data: { count: 1200 } }) // loads
      mockSupabase.single.mockResolvedValueOnce({ data: { sum: 45000 } }) // revenue
      mockSupabase.single.mockResolvedValueOnce({ data: { count: 85 } }) // active drivers
      mockSupabase.single.mockResolvedValueOnce({ data: { count: 5 } }) // pending applications

      const result = await getSystemAnalytics()

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        totalCompanies: 25,
        totalUsers: 150,
        totalVehicles: 300,
        totalLoads: 1200,
        monthlyRevenue: 45000,
        activeDrivers: 85,
        pendingApplications: 5,
      })
      expect(mockSupabase.from).toHaveBeenCalledWith('companies')
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.from).toHaveBeenCalledWith('vehicles')
      expect(mockSupabase.from).toHaveBeenCalledWith('loads')
    })

    it('should return error when user is not super admin', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'company_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })

      const result = await getSystemAnalytics()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Super admin access required')
    })

    it('should return error when user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await getSystemAnalytics()

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('should handle database errors gracefully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockRejectedValueOnce(new Error('Database connection failed'))

      const result = await getSystemAnalytics()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
    })
  })

  describe('getSystemUsers', () => {
    it('should fetch system users successfully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockUsers = [
        {
          id: 'user-1',
          email: 'admin@example.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'super_admin',
          company: { name: 'System' },
          created_at: '2024-01-01T00:00:00Z',
          last_sign_in_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'user-2',
          email: 'fleet@example.com',
          first_name: 'Fleet',
          last_name: 'Manager',
          role: 'company_admin',
          company: { name: 'Test Fleet Co' },
          created_at: '2024-01-02T00:00:00Z',
          last_sign_in_at: '2024-01-14T15:30:00Z',
        },
      ]

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.order.mockReturnValue(mockSupabase)
      mockSupabase.range.mockResolvedValue({ data: mockUsers, error: null })

      const result = await getSystemUsers()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUsers)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.select).toHaveBeenCalledWith(`
        *,
        company:companies(name)
      `)
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('should apply search filter correctly', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockUsers = [
        {
          id: 'user-2',
          email: 'fleet@example.com',
          first_name: 'Fleet',
          last_name: 'Manager',
          role: 'company_admin',
        },
      ]

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.order.mockReturnValue(mockSupabase)
      mockSupabase.range.mockReturnValue(mockSupabase)
      mockSupabase.ilike.mockResolvedValue({ data: mockUsers, error: null })

      const result = await getSystemUsers({ search: 'fleet' })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUsers)
      expect(mockSupabase.ilike).toHaveBeenCalledWith('email', '%fleet%')
    })

    it('should apply role filter correctly', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockUsers = [
        {
          id: 'user-2',
          email: 'admin@example.com',
          role: 'company_admin',
        },
      ]

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.order.mockReturnValue(mockSupabase)
      mockSupabase.range.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockResolvedValue({ data: mockUsers, error: null })

      const result = await getSystemUsers({ role: 'company_admin' })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUsers)
      expect(mockSupabase.eq).toHaveBeenCalledWith('role', 'company_admin')
    })

    it('should handle pagination correctly', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockUsers = []

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.order.mockReturnValue(mockSupabase)
      mockSupabase.range.mockResolvedValue({ data: mockUsers, error: null })

      const result = await getSystemUsers({ page: 2, limit: 25 })

      expect(result.success).toBe(true)
      expect(mockSupabase.range).toHaveBeenCalledWith(25, 49) // (page-1)*limit, page*limit-1
    })

    it('should return error when user is not super admin', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'company_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })

      const result = await getSystemUsers()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Super admin access required')
    })
  })

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockTargetUser = { id: 'user-2', role: 'driver' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockTargetUser })
      mockSupabase.update.mockResolvedValue({ error: null })

      const result = await updateUserRole('user-2', 'company_admin')

      expect(result.success).toBe(true)
      expect(result.message).toContain('User role updated successfully')
      expect(mockSupabase.update).toHaveBeenCalledWith({ role: 'company_admin' })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'user-2')
    })

    it('should prevent updating super admin role', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockTargetUser = { id: 'user-2', role: 'super_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockTargetUser })

      const result = await updateUserRole('user-2', 'company_admin')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot modify super admin users')
    })

    it('should return error when user not found', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: null })

      const result = await updateUserRole('user-999', 'company_admin')

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })

    it('should return error when user is not super admin', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'company_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })

      const result = await updateUserRole('user-2', 'driver')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Super admin access required')
    })
  })

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockTargetUser = { id: 'user-2', role: 'driver' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockTargetUser })
      mockSupabase.delete.mockResolvedValue({ error: null })

      const result = await deleteUser('user-2')

      expect(result.success).toBe(true)
      expect(result.message).toContain('User deleted successfully')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'user-2')
    })

    it('should prevent deleting super admin users', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockTargetUser = { id: 'user-2', role: 'super_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockTargetUser })

      const result = await deleteUser('user-2')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot delete super admin users')
    })

    it('should prevent self-deletion', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })

      const result = await deleteUser('user-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot delete your own account')
    })

    it('should return error when user not found', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: null })

      const result = await deleteUser('user-999')

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })

    it('should handle database deletion errors', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'super_admin' }
      const mockTargetUser = { id: 'user-2', role: 'driver' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockTargetUser })
      mockSupabase.delete.mockResolvedValue({ error: new Error('Deletion failed') })

      const result = await deleteUser('user-2')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Deletion failed')
    })
  })
})