"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { Driver } from "@/lib/types/database"

// Create a new driver
export async function createDriver(formData: FormData) {
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
    if (!['super_admin', 'company_admin', 'manager'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Extract form data
    const first_name = formData.get('first_name') as string
    const last_name = formData.get('last_name') as string
    const license_number = formData.get('license_number') as string
    const license_expiry = formData.get('license_expiry') as string
    const phone = formData.get('phone') as string
    const email = formData.get('email') as string
    const address = formData.get('address') as string
    const emergency_contact_name = formData.get('emergency_contact_name') as string
    const emergency_contact_phone = formData.get('emergency_contact_phone') as string
    const user_id = formData.get('user_id') as string

    // Create driver
    const { data: driver, error } = await supabase
      .from('drivers')
      .insert({
        company_id: profile.company_id,
        user_id: user_id || null,
        first_name,
        last_name,
        license_number,
        license_expiry,
        phone,
        email,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/drivers')
    return { 
      success: true, 
      data: driver,
      message: `Driver ${first_name} ${last_name} created successfully` 
    }
  } catch (error) {
    console.error('Error creating driver:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create driver' 
    }
  }
}

// Update an existing driver
export async function updateDriver(driverId: string, formData: FormData) {
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
    if (!['super_admin', 'company_admin', 'manager'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Verify driver exists and belongs to company
    const { data: existingDriver } = await supabase
      .from('drivers')
      .select('id')
      .eq('id', driverId)
      .eq('company_id', profile.company_id)
      .single()

    if (!existingDriver) {
      throw new Error('Driver not found')
    }

    // Extract form data
    const first_name = formData.get('first_name') as string
    const last_name = formData.get('last_name') as string
    const license_number = formData.get('license_number') as string
    const license_expiry = formData.get('license_expiry') as string
    const phone = formData.get('phone') as string
    const email = formData.get('email') as string
    const address = formData.get('address') as string
    const emergency_contact_name = formData.get('emergency_contact_name') as string
    const emergency_contact_phone = formData.get('emergency_contact_phone') as string
    const user_id = formData.get('user_id') as string
    const is_active = formData.get('is_active') === 'true'

    // Update driver
    const { data: driver, error } = await supabase
      .from('drivers')
      .update({
        user_id: user_id || null,
        first_name,
        last_name,
        license_number,
        license_expiry,
        phone,
        email,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', driverId)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/drivers')
    revalidatePath(`/drivers/${driverId}`)
    return { 
      success: true, 
      data: driver,
      message: `Driver ${first_name} ${last_name} updated successfully` 
    }
  } catch (error) {
    console.error('Error updating driver:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update driver' 
    }
  }
}

// Delete a driver
export async function deleteDriver(driverId: string) {
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
    if (!['super_admin', 'company_admin', 'manager'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Check if driver has active loads
    const { data: activeLoads } = await supabase
      .from('loads')
      .select('id')
      .eq('assigned_driver_id', driverId)
      .in('status', ['pending', 'assigned', 'in_transit'])

    if (activeLoads && activeLoads.length > 0) {
      throw new Error('Cannot delete driver with active loads. Please reassign loads first.')
    }

    // Get driver info for response
    const { data: driver } = await supabase
      .from('drivers')
      .select('first_name, last_name')
      .eq('id', driverId)
      .eq('company_id', profile.company_id)
      .single()

    if (!driver) {
      throw new Error('Driver not found')
    }

    // Delete driver
    const { error } = await supabase
      .from('drivers')
      .delete()
      .eq('id', driverId)
      .eq('company_id', profile.company_id)

    if (error) {
      throw error
    }

    revalidatePath('/drivers')
    return { 
      success: true, 
      message: `Driver ${driver.first_name} ${driver.last_name} deleted successfully` 
    }
  } catch (error) {
    console.error('Error deleting driver:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete driver' 
    }
  }
}

// Toggle driver active status
export async function toggleDriverStatus(driverId: string) {
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
    if (!['super_admin', 'company_admin', 'manager'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Get current driver status
    const { data: driver } = await supabase
      .from('drivers')
      .select('is_active, first_name, last_name')
      .eq('id', driverId)
      .eq('company_id', profile.company_id)
      .single()

    if (!driver) {
      throw new Error('Driver not found')
    }

    // If deactivating, check for active loads
    if (driver.is_active) {
      const { data: activeLoads } = await supabase
        .from('loads')
        .select('id')
        .eq('assigned_driver_id', driverId)
        .in('status', ['pending', 'assigned', 'in_transit'])

      if (activeLoads && activeLoads.length > 0) {
        throw new Error('Cannot deactivate driver with active loads. Please reassign loads first.')
      }
    }

    // Toggle status
    const { data: updatedDriver, error } = await supabase
      .from('drivers')
      .update({
        is_active: !driver.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', driverId)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/drivers')
    revalidatePath(`/drivers/${driverId}`)
    return { 
      success: true, 
      data: updatedDriver,
      message: `Driver ${driver.first_name} ${driver.last_name} ${updatedDriver.is_active ? 'activated' : 'deactivated'} successfully` 
    }
  } catch (error) {
    console.error('Error toggling driver status:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update driver status' 
    }
  }
}

// Get drivers for a company
export async function getDrivers() {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Fetch drivers with load count
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select(`
        *,
        user:profiles(first_name, last_name, email),
        loads:loads(count)
      `)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return { success: true, data: drivers }
  } catch (error) {
    console.error('Error fetching drivers:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch drivers' 
    }
  }
}

// Get single driver by ID
export async function getDriver(driverId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Fetch driver with related data
    const { data: driver, error } = await supabase
      .from('drivers')
      .select(`
        *,
        user:profiles(first_name, last_name, email),
        loads:loads(
          id,
          load_number,
          status,
          pickup_city,
          delivery_city,
          pickup_date,
          delivery_date
        )
      `)
      .eq('id', driverId)
      .eq('company_id', profile.company_id)
      .single()

    if (error) {
      throw error
    }

    return { success: true, data: driver }
  } catch (error) {
    console.error('Error fetching driver:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch driver' 
    }
  }
}

// Get available drivers for load assignment
export async function getAvailableDrivers() {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Fetch active drivers not currently assigned to in-transit loads
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select(`
        id,
        first_name,
        last_name,
        license_number,
        phone,
        loads:loads!inner(status)
      `)
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .not('loads.status', 'in', '(in_transit)')

    if (error) {
      throw error
    }

    return { success: true, data: drivers }
  } catch (error) {
    console.error('Error fetching available drivers:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch available drivers' 
    }
  }
}

// Assign driver to load
export async function assignDriverToLoad(driverId: string, loadId: string) {
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
    if (!['super_admin', 'company_admin', 'manager', 'dispatcher'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Verify driver is available
    const { data: driver } = await supabase
      .from('drivers')
      .select('first_name, last_name, is_active')
      .eq('id', driverId)
      .eq('company_id', profile.company_id)
      .single()

    if (!driver) {
      throw new Error('Driver not found')
    }

    if (!driver.is_active) {
      throw new Error('Driver is not active')
    }

    // Check if driver has active loads
    const { data: activeLoads } = await supabase
      .from('loads')
      .select('id')
      .eq('assigned_driver_id', driverId)
      .eq('status', 'in_transit')

    if (activeLoads && activeLoads.length > 0) {
      throw new Error('Driver is already assigned to an active load')
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

    // Assign driver to load
    const { data: updatedLoad, error } = await supabase
      .from('loads')
      .update({
        assigned_driver_id: driverId,
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
    revalidatePath('/drivers')
    revalidatePath(`/drivers/${driverId}`)
    revalidatePath(`/loads/${loadId}`)
    
    return { 
      success: true, 
      data: updatedLoad,
      message: `Driver ${driver.first_name} ${driver.last_name} assigned to Load ${load.load_number}` 
    }
  } catch (error) {
    console.error('Error assigning driver to load:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to assign driver to load' 
    }
  }
}

// Unassign driver from load
export async function unassignDriverFromLoad(loadId: string) {
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
    if (!['super_admin', 'company_admin', 'manager', 'dispatcher'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Get load details
    const { data: load } = await supabase
      .from('loads')
      .select(`
        load_number,
        status,
        assigned_driver_id,
        driver:drivers!inner(first_name, last_name)
      `)
      .eq('id', loadId)
      .eq('company_id', profile.company_id)
      .single()

    if (!load) {
      throw new Error('Load not found')
    }

    if (load.status === 'in_transit') {
      throw new Error('Cannot unassign driver from load in transit')
    }

    if (!load.assigned_driver_id) {
      throw new Error('No driver assigned to this load')
    }

    // Unassign driver
    const { data: updatedLoad, error } = await supabase
      .from('loads')
      .update({
        assigned_driver_id: null,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', loadId)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/loads')
    revalidatePath('/drivers')
    revalidatePath(`/drivers/${load.assigned_driver_id}`)
    revalidatePath(`/loads/${loadId}`)
    
    const driverName = load.driver ? `${load.driver.first_name} ${load.driver.last_name}` : 'Driver'
    
    return { 
      success: true, 
      data: updatedLoad,
      message: `${driverName} unassigned from Load ${load.load_number}` 
    }
  } catch (error) {
    console.error('Error unassigning driver from load:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to unassign driver from load' 
    }
  }
}
