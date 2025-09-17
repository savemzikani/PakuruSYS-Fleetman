"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
// Expense types
type ExpenseCategory = 'fuel' | 'maintenance' | 'repairs' | 'tolls' | 'insurance' | 'permits' | 'accommodation' | 'meals' | 'parking' | 'fines' | 'other'
type ExpenseStatus = 'pending' | 'approved' | 'rejected'

// Create a new expense
export async function createExpense(formData: FormData) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Check permissions
    if (!['super_admin', 'company_admin', 'manager', 'dispatcher', 'driver'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Extract form data
    const category = formData.get('category') as ExpenseCategory
    const description = formData.get('description') as string
    const amount = parseFloat(formData.get('amount') as string)
    const currency = formData.get('currency') as string || 'USD'
    const expense_date = formData.get('expense_date') as string
    const load_id = formData.get('load_id') as string || null
    const vehicle_id = formData.get('vehicle_id') as string || null
    const receipt_url = formData.get('receipt_url') as string || null
    const notes = formData.get('notes') as string || null

    // Validate required fields
    if (!category || !description || !amount || !expense_date) {
      throw new Error('Category, description, amount, and date are required')
    }

    // Verify load belongs to company if provided
    if (load_id) {
      const { data: load } = await supabase
        .from('loads')
        .select('id')
        .eq('id', load_id)
        .eq('company_id', profile.company_id)
        .single()

      if (!load) {
        throw new Error('Invalid load selected')
      }
    }

    // Verify vehicle belongs to company if provided
    if (vehicle_id) {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('id', vehicle_id)
        .eq('company_id', profile.company_id)
        .single()

      if (!vehicle) {
        throw new Error('Invalid vehicle selected')
      }
    }

    // Create expense
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        company_id: profile.company_id,
        category,
        description,
        amount,
        currency,
        expense_date,
        load_id,
        vehicle_id,
        receipt_url,
        notes,
        submitted_by: user.id,
        status: 'pending' as ExpenseStatus
      })
      .select(`
        *,
        load:loads(load_number),
        vehicle:vehicles(registration_number),
        submitted_by_profile:profiles!submitted_by(first_name, last_name)
      `)
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/expenses')
    return { 
      success: true, 
      data: expense,
      message: `Expense for ${description} created successfully` 
    }
  } catch (error) {
    console.error('Error creating expense:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create expense' 
    }
  }
}

// Update an existing expense
export async function updateExpense(expenseId: string, formData: FormData) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Get existing expense
    const { data: existingExpense } = await supabase
      .from('expenses')
      .select('id, status, submitted_by')
      .eq('id', expenseId)
      .eq('company_id', profile.company_id)
      .single()

    if (!existingExpense) {
      throw new Error('Expense not found')
    }

    // Check permissions - only submitter can edit pending expenses, admins can edit any
    const canEdit = ['super_admin', 'company_admin', 'manager'].includes(profile.role) ||
                   (existingExpense.submitted_by === user.id && existingExpense.status === 'pending')

    if (!canEdit) {
      throw new Error('Insufficient permissions to edit this expense')
    }

    // Only allow editing pending expenses
    if (existingExpense.status !== 'pending') {
      throw new Error('Can only edit pending expenses')
    }

    // Extract form data
    const category = formData.get('category') as ExpenseCategory
    const description = formData.get('description') as string
    const amount = parseFloat(formData.get('amount') as string)
    const currency = formData.get('currency') as string || 'USD'
    const expense_date = formData.get('expense_date') as string
    const load_id = formData.get('load_id') as string || null
    const vehicle_id = formData.get('vehicle_id') as string || null
    const receipt_url = formData.get('receipt_url') as string || null
    const notes = formData.get('notes') as string || null

    // Update expense
    const { data: expense, error } = await supabase
      .from('expenses')
      .update({
        category,
        description,
        amount,
        currency,
        expense_date,
        load_id,
        vehicle_id,
        receipt_url,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId)
      .select(`
        *,
        load:loads(load_number),
        vehicle:vehicles(registration_number),
        submitted_by_profile:profiles!submitted_by(first_name, last_name)
      `)
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/expenses')
    revalidatePath(`/expenses/${expenseId}`)
    return { 
      success: true, 
      data: expense,
      message: `Expense updated successfully` 
    }
  } catch (error) {
    console.error('Error updating expense:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update expense' 
    }
  }
}

// Approve or reject expense
export async function updateExpenseStatus(expenseId: string, status: ExpenseStatus, notes?: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Check permissions - only managers and above can approve/reject
    if (!['super_admin', 'company_admin', 'manager'].includes(profile.role)) {
      throw new Error('Insufficient permissions to approve/reject expenses')
    }

    // Get existing expense
    const { data: existingExpense } = await supabase
      .from('expenses')
      .select('id, status, description, amount, currency')
      .eq('id', expenseId)
      .eq('company_id', profile.company_id)
      .single()

    if (!existingExpense) {
      throw new Error('Expense not found')
    }

    // Validate status transition
    if (existingExpense.status !== 'pending') {
      throw new Error('Can only approve/reject pending expenses')
    }

    if (!['approved', 'rejected'].includes(status)) {
      throw new Error('Invalid status. Must be approved or rejected')
    }

    // Update expense status
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    }

    if (notes) {
      updateData.review_notes = notes
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .select(`
        *,
        load:loads(load_number),
        vehicle:vehicles(registration_number),
        submitted_by_profile:profiles!submitted_by(first_name, last_name),
        reviewed_by_profile:profiles!reviewed_by(first_name, last_name)
      `)
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/expenses')
    revalidatePath(`/expenses/${expenseId}`)
    return { 
      success: true, 
      data: expense,
      message: `Expense ${status} successfully` 
    }
  } catch (error) {
    console.error('Error updating expense status:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update expense status' 
    }
  }
}

// Delete an expense
export async function deleteExpense(expenseId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Get existing expense
    const { data: expense } = await supabase
      .from('expenses')
      .select('id, status, submitted_by, description')
      .eq('id', expenseId)
      .eq('company_id', profile.company_id)
      .single()

    if (!expense) {
      throw new Error('Expense not found')
    }

    // Check permissions - only submitter can delete pending expenses, admins can delete any pending
    const canDelete = ['super_admin', 'company_admin', 'manager'].includes(profile.role) ||
                     (expense.submitted_by === user.id && expense.status === 'pending')

    if (!canDelete) {
      throw new Error('Insufficient permissions to delete this expense')
    }

    // Only allow deleting pending expenses
    if (expense.status !== 'pending') {
      throw new Error('Can only delete pending expenses')
    }

    // Delete expense
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (error) {
      throw error
    }

    revalidatePath('/expenses')
    return { 
      success: true, 
      message: `Expense "${expense.description}" deleted successfully` 
    }
  } catch (error) {
    console.error('Error deleting expense:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete expense' 
    }
  }
}

// Get expenses for a company
export async function getExpenses(filters?: {
  status?: ExpenseStatus
  category?: ExpenseCategory
  submitted_by?: string
  load_id?: string
  vehicle_id?: string
  date_from?: string
  date_to?: string
}) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Build query
    let query = supabase
      .from('expenses')
      .select(`
        *,
        load:loads(load_number, pickup_city, delivery_city),
        vehicle:vehicles(registration_number, make, model),
        submitted_by_profile:profiles!submitted_by(first_name, last_name),
        reviewed_by_profile:profiles!reviewed_by(first_name, last_name)
      `)
      .eq('company_id', profile.company_id)
      .order('expense_date', { ascending: false })

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.category) {
      query = query.eq('category', filters.category)
    }
    if (filters?.submitted_by) {
      query = query.eq('submitted_by', filters.submitted_by)
    }
    if (filters?.load_id) {
      query = query.eq('load_id', filters.load_id)
    }
    if (filters?.vehicle_id) {
      query = query.eq('vehicle_id', filters.vehicle_id)
    }
    if (filters?.date_from) {
      query = query.gte('expense_date', filters.date_from)
    }
    if (filters?.date_to) {
      query = query.lte('expense_date', filters.date_to)
    }

    // If user is a driver, only show their expenses
    if (profile.role === 'driver') {
      query = query.eq('submitted_by', user.id)
    }

    const { data: expenses, error } = await query

    if (error) {
      throw error
    }

    return { success: true, data: expenses }
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch expenses'
    }
  }
}

// Get single expense by ID
export async function getExpense(expenseId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Build query
    let query = supabase
      .from('expenses')
      .select(`
        *,
        load:loads(*),
        vehicle:vehicles(*),
        submitted_by_profile:profiles!submitted_by(*),
        reviewed_by_profile:profiles!reviewed_by(*),
        company:companies(*)
      `)
      .eq('id', expenseId)
      .eq('company_id', profile.company_id)

    // If user is a driver, ensure they can only see their expenses
    if (profile.role === 'driver') {
      query = query.eq('submitted_by', user.id)
    }

    const { data: expense, error } = await query.single()

    if (error) {
      throw error
    }

    return { success: true, data: expense }
  } catch (error) {
    console.error('Error fetching expense:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch expense'
    }
  }
}

// Get expense statistics
export async function getExpenseStats(filters?: {
  date_from?: string
  date_to?: string
  category?: ExpenseCategory
}) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Build query
    let query = supabase
      .from('expenses')
      .select('status, category, amount, currency, expense_date')
      .eq('company_id', profile.company_id)

    // Apply filters
    if (filters?.date_from) {
      query = query.gte('expense_date', filters.date_from)
    }
    if (filters?.date_to) {
      query = query.lte('expense_date', filters.date_to)
    }
    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    // If user is a driver, only show their expenses
    if (profile.role === 'driver') {
      query = query.eq('submitted_by', user.id)
    }

    const { data: expenses, error } = await query

    if (error) {
      throw error
    }

    if (!expenses || expenses.length === 0) {
      return {
        success: true,
        data: {
          totalExpenses: 0,
          pendingExpenses: 0,
          approvedExpenses: 0,
          rejectedExpenses: 0,
          totalAmount: 0,
          approvedAmount: 0,
          pendingAmount: 0,
          byCategory: {},
          byMonth: {}
        }
      }
    }

    // Calculate statistics
    const stats = {
      totalExpenses: expenses.length,
      pendingExpenses: expenses.filter(e => e.status === 'pending').length,
      approvedExpenses: expenses.filter(e => e.status === 'approved').length,
      rejectedExpenses: expenses.filter(e => e.status === 'rejected').length,
      totalAmount: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
      approvedAmount: expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0),
      pendingAmount: expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0),
      byCategory: expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + (e.amount || 0)
        return acc
      }, {} as Record<string, number>),
      byMonth: expenses.reduce((acc, e) => {
        const month = new Date(e.expense_date).toISOString().substring(0, 7) // YYYY-MM
        acc[month] = (acc[month] || 0) + (e.amount || 0)
        return acc
      }, {} as Record<string, number>)
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error('Error fetching expense stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch expense statistics'
    }
  }
}

// Upload expense receipt
export async function uploadExpenseReceipt(expenseId: string, file: File) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Verify expense exists and user has access
    const { data: expense } = await supabase
      .from('expenses')
      .select('id, submitted_by, status')
      .eq('id', expenseId)
      .eq('company_id', profile.company_id)
      .single()

    if (!expense) {
      throw new Error('Expense not found')
    }

    // Check permissions
    const canUpload = ['super_admin', 'company_admin', 'manager'].includes(profile.role) ||
                     expense.submitted_by === user.id

    if (!canUpload) {
      throw new Error('Insufficient permissions to upload receipt')
    }

    // Validate file
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB')
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('File must be an image (JPEG, PNG, WebP) or PDF')
    }

    // Generate file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${expenseId}-${Date.now()}.${fileExt}`
    const filePath = `expenses/${profile.company_id}/${fileName}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    // Update expense with receipt URL
    const { data: updatedExpense, error: updateError } = await supabase
      .from('expenses')
      .update({
        receipt_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    revalidatePath('/expenses')
    revalidatePath(`/expenses/${expenseId}`)
    return {
      success: true,
      data: { receipt_url: publicUrl },
      message: 'Receipt uploaded successfully'
    }
  } catch (error) {
    console.error('Error uploading expense receipt:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload receipt'
    }
  }
}
