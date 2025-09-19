/**
 * @jest-environment node
 */

import { createLoad, updateLoad, deleteLoad } from '@/lib/actions/loads'

// Mock the Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { company_id: 'company-123', role: 'manager' }
      }),
      insert: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'load-123', description: 'Test load', load_number: 'L-2024-001' },
          error: null
        })
      }))
    })),
    rpc: jest.fn().mockResolvedValue({
      data: 'L-2024-001'
    })
  }))
}))

// Mock Next.js cache revalidation
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}))

describe('Loads Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create a load successfully', async () => {
    const formData = new FormData()
    formData.append('customer_id', 'customer-123')
    formData.append('description', 'Test load')
    formData.append('pickup_address', '123 Main St')
    formData.append('pickup_city', 'New York')
    formData.append('pickup_country', 'USA')
    formData.append('pickup_date', '2024-01-01')
    formData.append('delivery_address', '456 Oak Ave')
    formData.append('delivery_city', 'Los Angeles')
    formData.append('delivery_country', 'USA')
    formData.append('delivery_date', '2024-01-05')

    const result = await createLoad(formData)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('should handle missing required fields', async () => {
    const formData = new FormData()
    // Missing required fields - only add customer_id to trigger validation

    const result = await createLoad(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})