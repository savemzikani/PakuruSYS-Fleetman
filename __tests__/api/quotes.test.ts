/**
 * @jest-environment node
 */

import { createQuote, updateQuote, deleteQuote } from '@/lib/actions/quotes'

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
          data: { 
            id: 'quote-123', 
            quote_number: 'Q-2024-001',
            customer_id: 'customer-123',
            total_amount: 1000
          },
          error: null
        })
      }))
    })),
    rpc: jest.fn().mockResolvedValue({
      data: 'Q-2024-001'
    })
  }))
}))

// Mock Next.js cache revalidation
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}))

describe('Quotes Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create a quote successfully', async () => {
    const formData = new FormData()
    formData.append('customer_id', 'customer-123')
    formData.append('quote_date', '2024-01-01')
    formData.append('valid_until', '2024-01-31')
    formData.append('subtotal', '1000')
    formData.append('tax_amount', '100')
    formData.append('total_amount', '1100')

    const result = await createQuote(formData)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('should handle missing required fields', async () => {
    const formData = new FormData()
    // Missing required fields - only add customer_id to trigger validation

    const result = await createQuote(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})