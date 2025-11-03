"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Load, LoadStatus } from "@/lib/types/database"

// Create a new load
export async function createLoad(formData: FormData) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Check permissions
    if (!['super_admin', 'company_admin', 'manager', 'dispatcher'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Extract form data
    const customer_id = formData.get('customer_id') as string
    const description = formData.get('description') as string
    const weight_kg = formData.get('weight_kg') ? parseFloat(formData.get('weight_kg') as string) : null
    const volume_m3 = formData.get('volume_m3') ? parseFloat(formData.get('volume_m3') as string) : null
    const pickup_address = formData.get('pickup_address') as string
    const pickup_city = formData.get('pickup_city') as string
    const pickup_country = formData.get('pickup_country') as string
    const pickup_date = formData.get('pickup_date') as string
    const delivery_address = formData.get('delivery_address') as string
    const delivery_city = formData.get('delivery_city') as string
    const delivery_country = formData.get('delivery_country') as string
    const delivery_date = formData.get('delivery_date') as string
    const rate = formData.get('rate') ? parseFloat(formData.get('rate') as string) : null
    const currency = formData.get('currency') as string || 'USD'
    const special_instructions = formData.get('special_instructions') as string

    // Generate load number
    const { data: loadNumber } = await supabase
      .rpc('generate_load_number', { company_uuid: profile.company_id })

    // Create load
    const { data: load, error } = await supabase
      .from('loads')
      .insert({
        company_id: profile.company_id,
        customer_id,
        load_number: loadNumber,
        description,
        weight_kg,
        volume_m3,
        pickup_address,
        pickup_city,
        pickup_country,
        pickup_date: pickup_date || null,
        delivery_address,
        delivery_city,
        delivery_country,
        delivery_date: delivery_date || null,
        status: 'pending' as LoadStatus,
        rate,
        currency,
        dispatcher_id: user.id,
        special_instructions
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/loads')
    return { 
      success: true, 
      data: load,
      message: `Load ${load.load_number} created successfully` 
    }
  } catch (error) {
    console.error('Error creating load:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create load' 
    }
  }
}

// Update an existing load
export async function updateLoad(loadId: string, formData: FormData) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Check permissions
    if (!['super_admin', 'company_admin', 'manager', 'dispatcher'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Verify load exists and belongs to company
    const { data: existingLoad } = await supabase
      .from('loads')
      .select('id, status')
      .eq('id', loadId)
      .eq('company_id', profile.company_id)
      .single()

    if (!existingLoad) {
      throw new Error('Load not found')
    }

    // Only allow editing pending or assigned loads
    if (!['pending', 'assigned'].includes(existingLoad.status)) {
      throw new Error('Cannot edit load with current status')
    }

    // Extract form data
    const customer_id = formData.get('customer_id') as string
    const description = formData.get('description') as string
    const weight_kg = formData.get('weight_kg') ? parseFloat(formData.get('weight_kg') as string) : null
    const volume_m3 = formData.get('volume_m3') ? parseFloat(formData.get('volume_m3') as string) : null
    const pickup_address = formData.get('pickup_address') as string
    const pickup_city = formData.get('pickup_city') as string
    const pickup_country = formData.get('pickup_country') as string
    const pickup_date = formData.get('pickup_date') as string
    const delivery_address = formData.get('delivery_address') as string
    const delivery_city = formData.get('delivery_city') as string
    const delivery_country = formData.get('delivery_country') as string
    const delivery_date = formData.get('delivery_date') as string
    const rate = formData.get('rate') ? parseFloat(formData.get('rate') as string) : null
    const currency = formData.get('currency') as string || 'USD'
    const special_instructions = formData.get('special_instructions') as string

    // Update load
    const { data: load, error } = await supabase
      .from('loads')
      .update({
        customer_id,
        description,
        weight_kg,
        volume_m3,
        pickup_address,
        pickup_city,
        pickup_country,
        pickup_date: pickup_date || null,
        delivery_address,
        delivery_city,
        delivery_country,
        delivery_date: delivery_date || null,
        rate,
        currency,
        special_instructions,
        updated_at: new Date().toISOString()
      })
      .eq('id', loadId)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/loads')
    revalidatePath(`/loads/${loadId}`)
    return { 
      success: true, 
      data: load,
      message: `Load ${load.load_number} updated successfully` 
    }
  } catch (error) {
    console.error('Error updating load:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update load' 
    }
  }
}

// Update load status
export async function updateLoadStatus(loadId: string, status: LoadStatus) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Check permissions based on status change
    const allowedRoles = ['super_admin', 'company_admin', 'manager', 'dispatcher']
    if (status === 'delivered') {
      allowedRoles.push('driver') // Drivers can mark loads as delivered
    }

    if (!allowedRoles.includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Get current load
    const { data: currentLoad } = await supabase
      .from('loads')
      .select('load_number, status, assigned_driver_id')
      .eq('id', loadId)
      .eq('company_id', profile.company_id)
      .single()

    if (!currentLoad) {
      throw new Error('Load not found')
    }

    // Validate status transition
    const validTransitions: Record<LoadStatus, LoadStatus[]> = {
      'pending': ['assigned', 'cancelled'],
      'assigned': ['in_transit', 'pending', 'cancelled'],
      'in_transit': ['delivered', 'cancelled'],
      'delivered': [], // Final state
      'cancelled': ['pending'] // Can reactivate cancelled loads
    }

    const currentStatus = currentLoad.status as LoadStatus
    if (!validTransitions[currentStatus]?.includes(status)) {
      throw new Error(`Cannot change status from ${currentLoad.status} to ${status}`)
    }

    // Additional validations
    if (status === 'in_transit' && !currentLoad.assigned_driver_id) {
      throw new Error('Cannot start transit without assigned driver')
    }

    // If driver is marking as delivered, ensure they are assigned to this load
    if (status === 'delivered' && profile.role === 'driver') {
      const { data: driverLoad } = await supabase
        .from('loads')
        .select('id')
        .eq('id', loadId)
        .eq('assigned_driver_id', profile.id)
        .single()

      if (!driverLoad) {
        throw new Error('You can only mark your assigned loads as delivered')
      }
    }

    // Update load status
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    // Add timestamp for specific status changes
    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    }

    const { data: load, error } = await supabase
      .from('loads')
      .update(updateData)
      .eq('id', loadId)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/loads')
    revalidatePath(`/loads/${loadId}`)
    if (currentLoad.assigned_driver_id) {
      revalidatePath(`/drivers/${currentLoad.assigned_driver_id}`)
    }

    return { 
      success: true, 
      data: load,
      message: `Load ${currentLoad.load_number} status updated to ${status}` 
    }
  } catch (error) {
    console.error('Error updating load status:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update load status' 
    }
  }
}

// Assign vehicle to load
export async function assignVehicleToLoad(loadId: string, vehicleId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Check permissions
    if (!['super_admin', 'company_admin', 'manager', 'dispatcher'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Verify vehicle is available
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('registration_number, status')
      .eq('id', vehicleId)
      .eq('company_id', profile.company_id)
      .single()

    if (!vehicle) {
      throw new Error('Vehicle not found')
    }

    if (vehicle.status !== 'active') {
      throw new Error('Vehicle is not active')
    }

    // Verify load exists and is assignable
    const { data: load } = await supabase
      .from('loads')
      .select('load_number, status')
      .eq('id', loadId)
      .eq('company_id', profile.company_id)
      .single()

    if (!load) {
      throw new Error('Load not found')
    }

    if (!['pending', 'assigned'].includes(load.status)) {
      throw new Error('Load cannot be assigned in current status')
    }

    // Assign vehicle to load
    const { data: updatedLoad, error } = await supabase
      .from('loads')
      .update({
        assigned_vehicle_id: vehicleId,
        status: 'assigned',
        updated_at: new Date().toISOString()
      })
      .eq('id', loadId)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/loads')
    revalidatePath('/fleet')
    revalidatePath(`/fleet/${vehicleId}`)
    revalidatePath(`/loads/${loadId}`)
    
    return { 
      success: true, 
      data: updatedLoad,
      message: `Vehicle ${vehicle.registration_number} assigned to Load ${load.load_number}` 
    }
  } catch (error) {
    console.error('Error assigning vehicle to load:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to assign vehicle to load' 
    }
  }
}

// Delete a load
export async function deleteLoad(loadId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Check permissions
    if (!['super_admin', 'company_admin', 'manager'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Get load info
    const { data: load } = await supabase
      .from('loads')
      .select('load_number, status')
      .eq('id', loadId)
      .eq('company_id', profile.company_id)
      .single()

    if (!load) {
      throw new Error('Load not found')
    }

    // Only allow deleting pending loads
    if (load.status !== 'pending') {
      throw new Error('Can only delete pending loads')
    }

    // Delete load
    const { error } = await supabase
      .from('loads')
      .delete()
      .eq('id', loadId)

    if (error) {
      throw error
    }

    revalidatePath('/loads')
    return { 
      success: true, 
      message: `Load ${load.load_number} deleted successfully` 
    }
  } catch (error) {
    console.error('Error deleting load:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete load' 
    }
  }
}

// Get loads for a company
export async function getLoads(filters?: {
  status?: LoadStatus
  customer_id?: string
  assigned_driver_id?: string
  assigned_vehicle_id?: string
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
      .select('id, company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Build query
    let query = supabase
      .from('loads')
      .select(`
        *,
        customer:customers(name, contact_person),
        vehicle:vehicles(registration_number),
        driver:drivers(first_name, last_name)
      `)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id)
    }
    if (filters?.assigned_driver_id) {
      query = query.eq('assigned_driver_id', filters.assigned_driver_id)
    }
    if (filters?.assigned_vehicle_id) {
      query = query.eq('assigned_vehicle_id', filters.assigned_vehicle_id)
    }

    // If user is a driver, only show their assigned loads
    if (profile.role === 'driver') {
      query = query.eq('assigned_driver_id', user.id)
    }

    const { data: loads, error } = await query

    if (error) {
      throw error
    }

    return { success: true, data: loads }
  } catch (error) {
    console.error('Error fetching loads:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch loads'
    }
  }
}

// Get single load by ID
export async function getLoad(loadId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Build query
    let query = supabase
      .from('loads')
      .select(`
        *,
        customer:customers(*),
        vehicle:vehicles(*),
        driver:drivers(*),
        company:companies(*),
        tracking:load_tracking(*),
        documents:documents(*)
      `)
      .eq('id', loadId)
      .eq('company_id', profile.company_id)

    // If user is a driver, ensure they can only see their assigned loads
    if (profile.role === 'driver') {
      query = query.eq('assigned_driver_id', user.id)
    }

    const { data: load, error } = await query.single()

    if (error) {
      throw error
    }

    return { success: true, data: load }
  } catch (error) {
    console.error('Error fetching load:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch load'
    }
  }
}

// Add load tracking update
export async function addLoadTracking(loadId: string, formData: FormData) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Verify load exists and user has access
    let loadQuery = supabase
      .from('loads')
      .select('id, load_number, status')
      .eq('id', loadId)
      .eq('company_id', profile.company_id)

    // If driver, ensure they're assigned to this load
    if (profile.role === 'driver') {
      loadQuery = loadQuery.eq('assigned_driver_id', user.id)
    }

    const { data: load } = await loadQuery.single()

    if (!load) {
      throw new Error('Load not found or access denied')
    }

    // Extract form data
    const status = formData.get('status') as LoadStatus
    const location = formData.get('location') as string
    const latitude = formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : null
    const longitude = formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : null
    const notes = formData.get('notes') as string

    // Create tracking record
    const { data: tracking, error } = await supabase
      .from('load_tracking')
      .insert({
        load_id: loadId,
        status,
        location,
        latitude,
        longitude,
        notes,
        updated_by: user.id
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Update load status if different
    if (status !== load.status) {
      await supabase
        .from('loads')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', loadId)
    }

    revalidatePath('/loads')
    revalidatePath(`/loads/${loadId}`)
    
    return { 
      success: true, 
      data: tracking,
      message: `Tracking update added for Load ${load.load_number}` 
    }
  } catch (error) {
    console.error('Error adding load tracking:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add tracking update' 
    }
  }
}
