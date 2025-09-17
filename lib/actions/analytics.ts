"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Get company analytics dashboard data
export async function getCompanyAnalytics(dateRange?: { from: string; to: string }) {
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

    // Check if advanced analytics is enabled
    const { data: features } = await supabase
      .from('feature_toggles')
      .select('is_enabled')
      .eq('company_id', profile.company_id)
      .eq('feature_name', 'advanced_analytics')
      .single()

    if (!features?.is_enabled) {
      throw new Error('Advanced analytics not enabled for this company')
    }

    const fromDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const toDate = dateRange?.to || new Date().toISOString().split('T')[0]

    // Get aggregated analytics data
    const { data: analytics, error } = await supabase
      .from('daily_analytics')
      .select('*')
      .eq('company_id', profile.company_id)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: true })

    if (error) {
      throw error
    }

    // Calculate summary metrics
    const summary = analytics?.reduce((acc, day) => ({
      totalLoads: acc.totalLoads + day.total_loads,
      completedLoads: acc.completedLoads + day.completed_loads,
      totalRevenue: acc.totalRevenue + parseFloat(day.revenue || '0'),
      totalExpenses: acc.totalExpenses + parseFloat(day.expenses || '0'),
      averageRating: day.average_rating ? 
        (acc.averageRating * acc.ratingCount + day.average_rating) / (acc.ratingCount + 1) : 
        acc.averageRating,
      ratingCount: day.average_rating ? acc.ratingCount + 1 : acc.ratingCount
    }), {
      totalLoads: 0,
      completedLoads: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      averageRating: 0,
      ratingCount: 0
    }) || {
      totalLoads: 0,
      completedLoads: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      averageRating: 0,
      ratingCount: 0
    }

    // Get real-time current metrics
    const [
      { data: currentLoads },
      { data: currentRevenue },
      { data: currentExpenses },
      { data: currentRating }
    ] = await Promise.all([
      supabase
        .from('loads')
        .select('status')
        .eq('company_id', profile.company_id)
        .gte('created_at', fromDate)
        .lte('created_at', toDate + 'T23:59:59'),
      supabase
        .from('invoices')
        .select('total_amount')
        .eq('company_id', profile.company_id)
        .eq('status', 'paid')
        .gte('paid_date', fromDate)
        .lte('paid_date', toDate),
      supabase
        .from('expenses')
        .select('amount')
        .eq('company_id', profile.company_id)
        .eq('status', 'approved')
        .gte('expense_date', fromDate)
        .lte('expense_date', toDate),
      supabase
        .from('customer_ratings')
        .select('rating')
        .eq('company_id', profile.company_id)
        .gte('created_at', fromDate)
        .lte('created_at', toDate + 'T23:59:59')
    ])

    const realTimeMetrics = {
      totalLoads: currentLoads?.length || 0,
      completedLoads: currentLoads?.filter(l => l.status === 'delivered').length || 0,
      totalRevenue: currentRevenue?.reduce((sum, inv) => sum + parseFloat(inv.total_amount || '0'), 0) || 0,
      totalExpenses: currentExpenses?.reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0) || 0,
      averageRating: currentRating?.length ? 
        currentRating.reduce((sum, r) => sum + r.rating, 0) / currentRating.length : 0
    }

    return {
      success: true,
      data: {
        summary: realTimeMetrics,
        dailyData: analytics || [],
        dateRange: { from: fromDate, to: toDate },
        profit: realTimeMetrics.totalRevenue - realTimeMetrics.totalExpenses,
        completionRate: realTimeMetrics.totalLoads > 0 ? 
          (realTimeMetrics.completedLoads / realTimeMetrics.totalLoads) * 100 : 0
      }
    }
  } catch (error) {
    console.error('Error fetching company analytics:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch analytics'
    }
  }
}

// Get fleet performance analytics
export async function getFleetAnalytics() {
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

    // Get vehicle utilization
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select(`
        id,
        registration_number,
        status,
        loads:loads(count)
      `)
      .eq('company_id', profile.company_id)

    // Get driver performance
    const { data: drivers } = await supabase
      .from('drivers')
      .select(`
        id,
        first_name,
        last_name,
        loads:loads(count),
        completed_loads:loads!inner(count)
      `)
      .eq('company_id', profile.company_id)
      .eq('loads.status', 'delivered')

    return {
      success: true,
      data: {
        vehicles: vehicles || [],
        drivers: drivers || []
      }
    }
  } catch (error) {
    console.error('Error fetching fleet analytics:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch fleet analytics'
    }
  }
}

// Generate daily analytics (should be run as a cron job)
export async function generateDailyAnalytics(date?: string) {
  const supabase = await createClient()
  
  try {
    const targetDate = date || new Date().toISOString().split('T')[0]
    
    // Get all companies
    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .eq('status', 'active')

    if (!companies) {
      return { success: true, message: 'No companies to process' }
    }

    for (const company of companies) {
      // Calculate daily metrics for this company
      const [
        { data: loads },
        { data: revenue },
        { data: expenses },
        { data: vehicles },
        { data: drivers },
        { data: customers },
        { data: ratings }
      ] = await Promise.all([
        supabase
          .from('loads')
          .select('status')
          .eq('company_id', company.id)
          .gte('created_at', targetDate)
          .lt('created_at', new Date(new Date(targetDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
        supabase
          .from('invoices')
          .select('total_amount')
          .eq('company_id', company.id)
          .eq('status', 'paid')
          .eq('paid_date', targetDate),
        supabase
          .from('expenses')
          .select('amount')
          .eq('company_id', company.id)
          .eq('status', 'approved')
          .eq('expense_date', targetDate),
        supabase
          .from('vehicles')
          .select('id')
          .eq('company_id', company.id)
          .eq('status', 'active'),
        supabase
          .from('drivers')
          .select('id')
          .eq('company_id', company.id)
          .eq('is_active', true),
        supabase
          .from('customers')
          .select('id')
          .eq('company_id', company.id)
          .eq('is_active', true),
        supabase
          .from('customer_ratings')
          .select('rating')
          .eq('company_id', company.id)
          .gte('created_at', targetDate)
          .lt('created_at', new Date(new Date(targetDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      ])

      const analytics = {
        company_id: company.id,
        date: targetDate,
        total_loads: loads?.length || 0,
        completed_loads: loads?.filter(l => l.status === 'delivered').length || 0,
        revenue: revenue?.reduce((sum, inv) => sum + parseFloat(inv.total_amount || '0'), 0) || 0,
        expenses: expenses?.reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0) || 0,
        active_vehicles: vehicles?.length || 0,
        active_drivers: drivers?.length || 0,
        customer_count: customers?.length || 0,
        average_rating: ratings?.length ? 
          ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : null
      }

      // Upsert daily analytics
      await supabase
        .from('daily_analytics')
        .upsert(analytics, { onConflict: 'company_id,date' })
    }

    return { success: true, message: `Daily analytics generated for ${targetDate}` }
  } catch (error) {
    console.error('Error generating daily analytics:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate daily analytics'
    }
  }
}

// Get route analytics
export async function getRouteAnalytics() {
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

    // Get route performance data
    const { data: routes } = await supabase
      .from('loads')
      .select(`
        pickup_city,
        pickup_country,
        delivery_city,
        delivery_country,
        rate,
        status
      `)
      .eq('company_id', profile.company_id)
      .not('pickup_city', 'is', null)
      .not('delivery_city', 'is', null)

    if (!routes) {
      return { success: true, data: [] }
    }

    // Group by route
    const routeStats = routes.reduce((acc, load) => {
      const routeKey = `${load.pickup_city}, ${load.pickup_country} → ${load.delivery_city}, ${load.delivery_country}`
      
      if (!acc[routeKey]) {
        acc[routeKey] = {
          route: routeKey,
          totalLoads: 0,
          completedLoads: 0,
          totalRevenue: 0,
          averageRate: 0
        }
      }

      acc[routeKey].totalLoads++
      if (load.status === 'delivered') {
        acc[routeKey].completedLoads++
      }
      if (load.rate) {
        acc[routeKey].totalRevenue += parseFloat(load.rate.toString())
      }

      return acc
    }, {} as Record<string, any>)

    // Calculate averages and sort by performance
    const routeAnalytics = Object.values(routeStats).map((route: any) => ({
      ...route,
      averageRate: route.totalLoads > 0 ? route.totalRevenue / route.totalLoads : 0,
      completionRate: route.totalLoads > 0 ? (route.completedLoads / route.totalLoads) * 100 : 0
    })).sort((a, b) => b.totalRevenue - a.totalRevenue)

    return { success: true, data: routeAnalytics }
  } catch (error) {
    console.error('Error fetching route analytics:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch route analytics'
    }
  }
}
