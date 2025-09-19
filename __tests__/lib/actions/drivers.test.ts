import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createDriver,
  deleteDriver,
  toggleDriverStatus,
  getAvailableDrivers,
  assignDriverToLoad,
  unassignDriverFromLoad,
} from '@/lib/actions/drivers'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('next/cache')
jest.mock('next/navigation')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>

describe('Driver Actions', () => {
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
      delete: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      in: jest.fn(() => mockSupabase),
      not: jest.fn(() => mockSupabase),
      single: jest.fn(),
    }

    mockCreateClient.mockResolvedValue(mockSupabase)
  })

  describe('createDriver', () => {
    it('should create driver successfully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { company_id: 'company-1', role: 'company_admin' }
      const mockDriver = { id: 'driver-1', first_name: 'John', last_name: 'Doe' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockDriver, error: null })

      const formData = new FormData()
      formData.append('first_name', 'John')
      formData.append('last_name', 'Doe')
      formData.append('license_number', 'DL123456')
      formData.append('phone', '+1234567890')
      formData.append('email', 'john@example.com')

      const result = await createDriver(formData)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockDriver)
      expect(mockSupabase.from).toHaveBeenCalledWith('drivers')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/drivers')
    })

    it('should return error when user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const formData = new FormData()
      const result = await createDriver(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('should return error when user has insufficient permissions', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { company_id: 'company-1', role: 'driver' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })

      const formData = new FormData()
      const result = await createDriver(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insufficient permissions')
    })
  })

  describe('deleteDriver', () => {
    it('should delete driver successfully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { company_id: 'company-1', role: 'company_admin' }
      const mockDriver = { first_name: 'John', last_name: 'Doe' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.in.mockReturnValueOnce({ data: [] }) // No active loads
      mockSupabase.single.mockResolvedValueOnce({ data: mockDriver })
      mockSupabase.delete.mockResolvedValue({ error: null })

      const result = await deleteDriver('driver-1')

      expect(result.success).toBe(true)
      expect(result.message).toContain('John Doe deleted successfully')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/drivers')
    })

    it('should return error when driver has active loads', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { company_id: 'company-1', role: 'company_admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.in.mockReturnValueOnce({ data: [{ id: 'load-1' }] }) // Has active loads

      const result = await deleteDriver('driver-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot delete driver with active loads')
    })
  })

  describe('toggleDriverStatus', () => {
    it('should toggle driver status successfully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { company_id: 'company-1', role: 'company_admin' }
      const mockDriver = { is_active: true, first_name: 'John', last_name: 'Doe' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockDriver })
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.in.mockReturnValueOnce({ data: [] }) // No active loads
      mockSupabase.update.mockResolvedValue({ data: { ...mockDriver, is_active: false }, error: null })

      const result = await toggleDriverStatus('driver-1')

      expect(result.success).toBe(true)
      expect(result.message).toContain('John Doe deactivated successfully')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/drivers')
    })

    it('should return error when trying to deactivate driver with active loads', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { company_id: 'company-1', role: 'company_admin' }
      const mockDriver = { is_active: true, first_name: 'John', last_name: 'Doe' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockDriver })
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.in.mockReturnValueOnce({ data: [{ id: 'load-1' }] }) // Has active loads

      const result = await toggleDriverStatus('driver-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot deactivate driver with active loads')
    })
  })

  describe('getAvailableDrivers', () => {
    it('should fetch available drivers successfully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { company_id: 'company-1' }
      const mockDrivers = [
        { id: 'driver-1', first_name: 'John', last_name: 'Doe' },
        { id: 'driver-2', first_name: 'Jane', last_name: 'Smith' },
      ]

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile })
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.not.mockResolvedValue({ data: mockDrivers, error: null })

      const result = await getAvailableDrivers()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockDrivers)
    })

    it('should return error when user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await getAvailableDrivers()

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })
  })

  describe('assignDriverToLoad', () => {
    it('should assign driver to load successfully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { company_id: 'company-1', role: 'dispatcher' }
      const mockDriver = { first_name: 'John', last_name: 'Doe', is_active: true }
      const mockLoad = { load_number: 'LOAD-001', status: 'pending' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockDriver })
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce({ data: [] }) // No active loads for driver
      mockSupabase.single.mockResolvedValueOnce({ data: mockLoad })
      mockSupabase.update.mockResolvedValue({ data: { ...mockLoad, assigned_driver_id: 'driver-1' }, error: null })

      const result = await assignDriverToLoad('driver-1', 'load-1')

      expect(result.success).toBe(true)
      expect(result.message).toContain('John Doe assigned to load LOAD-001')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/loads')
    })

    it('should return error when driver is not active', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { company_id: 'company-1', role: 'dispatcher' }
      const mockDriver = { first_name: 'John', last_name: 'Doe', is_active: false }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockDriver })

      const result = await assignDriverToLoad('driver-1', 'load-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Driver is not active')
    })

    it('should return error when driver has active loads', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { company_id: 'company-1', role: 'dispatcher' }
      const mockDriver = { first_name: 'John', last_name: 'Doe', is_active: true }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockDriver })
      mockSupabase.select.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockReturnValueOnce({ data: [{ id: 'load-2' }] }) // Has active load

      const result = await assignDriverToLoad('driver-1', 'load-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Driver is already assigned to an active load')
    })
  })

  describe('unassignDriverFromLoad', () => {
    it('should unassign driver from load successfully', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { company_id: 'company-1', role: 'dispatcher' }
      const mockLoad = {
        load_number: 'LOAD-001',
        status: 'assigned',
        assigned_driver_id: 'driver-1',
        driver: { first_name: 'John', last_name: 'Doe' },
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockLoad })
      mockSupabase.update.mockResolvedValue({ data: { ...mockLoad, assigned_driver_id: null }, error: null })

      const result = await unassignDriverFromLoad('load-1')

      expect(result.success).toBe(true)
      expect(result.message).toContain('John Doe unassigned from load LOAD-001')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/loads')
    })

    it('should return error when load is in transit', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { company_id: 'company-1', role: 'dispatcher' }
      const mockLoad = {
        load_number: 'LOAD-001',
        status: 'in_transit',
        assigned_driver_id: 'driver-1',
        driver: { first_name: 'John', last_name: 'Doe' },
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockLoad })

      const result = await unassignDriverFromLoad('load-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot unassign driver from load in transit')
    })

    it('should return error when no driver is assigned', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { company_id: 'company-1', role: 'dispatcher' }
      const mockLoad = {
        load_number: 'LOAD-001',
        status: 'pending',
        assigned_driver_id: null,
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile })
      mockSupabase.single.mockResolvedValueOnce({ data: mockLoad })

      const result = await unassignDriverFromLoad('load-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('No driver assigned to this load')
    })
  })
})