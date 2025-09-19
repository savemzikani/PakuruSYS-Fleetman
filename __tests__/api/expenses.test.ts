/**
 * @jest-environment node
 */

import { createExpense, updateExpense, deleteExpense } from '@/lib/actions/expenses'

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
            id: 'expense-123', 
            description: 'Test expense',
            amount: 100,
            category: 'fuel'
          },
          error: null
        })
      }))
    }))
  }))
}))

// Mock Next.js cache revalidation
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}))

describe('Expenses Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create an expense successfully', async () => {
    const formData = new FormData()
    formData.append('category', 'fuel')
    formData.append('description', 'Test expense')
    formData.append('amount', '100')
    formData.append('expense_date', '2024-01-01')

    const result = await createExpense(formData)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('should handle missing required fields', async () => {
    const formData = new FormData()
    // Missing required fields

    const result = await createExpense(formData)

    expect(result.success).toBe(false)
    expect(result.error).toContain('required')
  })
})