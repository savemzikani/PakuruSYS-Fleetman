"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Submit customer rating and feedback
export async function submitCustomerRating(formData: FormData) {
  const supabase = await createClient()
  
  try {
    // Extract form data
    const customer_id = formData.get('customer_id') as string
    const load_id = formData.get('load_id') as string
    const rating = parseInt(formData.get('rating') as string)
    const feedback = formData.get('feedback') as string
    const is_anonymous = formData.get('is_anonymous') === 'true'
    
    // Service aspects (detailed ratings)
    const service_aspects = {
      punctuality: formData.get('punctuality_rating') ? parseInt(formData.get('punctuality_rating') as string) : null,
      communication: formData.get('communication_rating') ? parseInt(formData.get('communication_rating') as string) : null,
      vehicle_condition: formData.get('vehicle_condition_rating') ? parseInt(formData.get('vehicle_condition_rating') as string) : null,
      driver_professionalism: formData.get('driver_professionalism_rating') ? parseInt(formData.get('driver_professionalism_rating') as string) : null,
      cargo_handling: formData.get('cargo_handling_rating') ? parseInt(formData.get('cargo_handling_rating') as string) : null
    }

    // Validate required fields
    if (!customer_id || !rating || rating < 1 || rating > 5) {
      throw new Error('Customer ID and valid rating (1-5) are required')
    }

    // Get customer and load info
    const { data: customer } = await supabase
      .from('customers')
      .select('company_id, name')
      .eq('id', customer_id)
      .single()

    if (!customer) {
      throw new Error('Customer not found')
    }

    let loadInfo = null
    if (load_id) {
      const { data: load } = await supabase
        .from('loads')
        .select('load_number, status')
        .eq('id', load_id)
        .eq('customer_id', customer_id)
        .single()

      if (!load) {
        throw new Error('Load not found or does not belong to customer')
      }
      loadInfo = load
    }

    // Check if rating already exists for this load
    if (load_id) {
      const { data: existingRating } = await supabase
        .from('customer_ratings')
        .select('id')
        .eq('customer_id', customer_id)
        .eq('load_id', load_id)
        .single()

      if (existingRating) {
        throw new Error('Rating already submitted for this load')
      }
    }

    // Create rating
    const { data: ratingRecord, error } = await supabase
      .from('customer_ratings')
      .insert({
        company_id: customer.company_id,
        customer_id,
        load_id: load_id || null,
        rating,
        feedback,
        service_aspects,
        is_anonymous
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/admin/analytics')
    revalidatePath('/admin/customers')
    
    return { 
      success: true, 
      data: ratingRecord,
      message: `Rating submitted successfully${loadInfo ? ` for Load ${loadInfo.load_number}` : ''}` 
    }
  } catch (error) {
    console.error('Error submitting customer rating:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to submit rating' 
    }
  }
}

// Get customer ratings for a company
export async function getCustomerRatings(filters?: {
  customer_id?: string
  load_id?: string
  rating?: number
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
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Build query
    let query = supabase
      .from('customer_ratings')
      .select(`
        *,
        customer:customers(name, contact_person),
        load:loads(load_number, pickup_city, delivery_city)
      `)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id)
    }
    if (filters?.load_id) {
      query = query.eq('load_id', filters.load_id)
    }
    if (filters?.rating) {
      query = query.eq('rating', filters.rating)
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from)
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to + 'T23:59:59')
    }

    const { data: ratings, error } = await query

    if (error) {
      throw error
    }

    return { success: true, data: ratings }
  } catch (error) {
    console.error('Error fetching customer ratings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch ratings'
    }
  }
}

// Get rating statistics
export async function getRatingStats() {
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

    // Get all ratings for the company
    const { data: ratings } = await supabase
      .from('customer_ratings')
      .select('rating, service_aspects, created_at')
      .eq('company_id', profile.company_id)

    if (!ratings || ratings.length === 0) {
      return {
        success: true,
        data: {
          totalRatings: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          serviceAspects: {
            punctuality: 0,
            communication: 0,
            vehicle_condition: 0,
            driver_professionalism: 0,
            cargo_handling: 0
          },
          monthlyTrend: {}
        }
      }
    }

    // Calculate statistics
    const totalRatings = ratings.length
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings

    // Rating distribution
    const ratingDistribution = ratings.reduce((acc, r) => {
      acc[r.rating] = (acc[r.rating] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    // Service aspects averages
    const serviceAspects = ratings.reduce((acc, r) => {
      if (r.service_aspects) {
        Object.keys(r.service_aspects).forEach(aspect => {
          if (r.service_aspects[aspect]) {
            acc[aspect] = acc[aspect] || { sum: 0, count: 0 }
            acc[aspect].sum += r.service_aspects[aspect]
            acc[aspect].count += 1
          }
        })
      }
      return acc
    }, {} as Record<string, { sum: number; count: number }>)

    const serviceAverages = Object.keys(serviceAspects).reduce((acc, aspect) => {
      acc[aspect] = serviceAspects[aspect].sum / serviceAspects[aspect].count
      return acc
    }, {} as Record<string, number>)

    // Monthly trend
    const monthlyTrend = ratings.reduce((acc, r) => {
      const month = new Date(r.created_at).toISOString().substring(0, 7) // YYYY-MM
      acc[month] = acc[month] || { sum: 0, count: 0 }
      acc[month].sum += r.rating
      acc[month].count += 1
      return acc
    }, {} as Record<string, { sum: number; count: number }>)

    const monthlyAverages = Object.keys(monthlyTrend).reduce((acc, month) => {
      acc[month] = monthlyTrend[month].sum / monthlyTrend[month].count
      return acc
    }, {} as Record<string, number>)

    return {
      success: true,
      data: {
        totalRatings,
        averageRating: Math.round(averageRating * 100) / 100,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ...ratingDistribution },
        serviceAspects: {
          punctuality: 0,
          communication: 0,
          vehicle_condition: 0,
          driver_professionalism: 0,
          cargo_handling: 0,
          ...serviceAverages
        },
        monthlyTrend: monthlyAverages
      }
    }
  } catch (error) {
    console.error('Error fetching rating stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch rating statistics'
    }
  }
}

// Get customer portal ratings (for customers to view their own ratings)
export async function getCustomerPortalRatings(customerId: string) {
  const supabase = await createClient()
  
  try {
    // Verify customer access (in real implementation, this would use customer auth)
    const { data: customer } = await supabase
      .from('customers')
      .select('id, company_id')
      .eq('id', customerId)
      .eq('is_active', true)
      .single()

    if (!customer) {
      throw new Error('Customer not found')
    }

    // Get customer's ratings
    const { data: ratings, error } = await supabase
      .from('customer_ratings')
      .select(`
        *,
        load:loads(load_number, pickup_city, delivery_city, delivery_date)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return { success: true, data: ratings }
  } catch (error) {
    console.error('Error fetching customer portal ratings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch ratings'
    }
  }
}

// Update rating response (company response to customer feedback)
export async function updateRatingResponse(ratingId: string, response: string) {
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

    // Verify rating belongs to company
    const { data: rating } = await supabase
      .from('customer_ratings')
      .select('id')
      .eq('id', ratingId)
      .eq('company_id', profile.company_id)
      .single()

    if (!rating) {
      throw new Error('Rating not found')
    }

    // Add response to rating
    const { data: updatedRating, error } = await supabase
      .from('customer_ratings')
      .update({
        company_response: response,
        response_date: new Date().toISOString(),
        responded_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', ratingId)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/admin/ratings')
    return { 
      success: true, 
      data: updatedRating,
      message: 'Response added to customer rating' 
    }
  } catch (error) {
    console.error('Error updating rating response:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update rating response' 
    }
  }
}
