"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Get company feature toggles
export async function getCompanyFeatures(companyId?: string) {
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

    const targetCompanyId = companyId || profile.company_id

    // Super admins can view any company's features
    if (profile.role !== 'super_admin' && targetCompanyId !== profile.company_id) {
      throw new Error('Insufficient permissions')
    }

    // Get feature toggles
    const { data: features, error } = await supabase
      .from('feature_toggles')
      .select('feature_name, is_enabled, enabled_at, disabled_at')
      .eq('company_id', targetCompanyId)

    if (error) {
      throw error
    }

    // Convert to object for easy access
    const featureMap = features?.reduce((acc, feature) => {
      acc[feature.feature_name] = {
        enabled: feature.is_enabled,
        enabledAt: feature.enabled_at,
        disabledAt: feature.disabled_at
      }
      return acc
    }, {} as Record<string, { enabled: boolean; enabledAt?: string; disabledAt?: string }>) || {}

    return { success: true, data: featureMap }
  } catch (error) {
    console.error('Error fetching company features:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch features'
    }
  }
}

// Toggle a feature for a company
export async function toggleCompanyFeature(featureName: string, enabled: boolean, companyId?: string) {
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

    const targetCompanyId = companyId || profile.company_id

    // Only super admins and company admins can toggle features
    if (!['super_admin', 'company_admin'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Super admins can toggle any company's features, company admins only their own
    if (profile.role !== 'super_admin' && targetCompanyId !== profile.company_id) {
      throw new Error('Insufficient permissions')
    }

    // Update or insert feature toggle
    const { data: feature, error } = await supabase
      .from('feature_toggles')
      .upsert({
        company_id: targetCompanyId,
        feature_name: featureName,
        is_enabled: enabled,
        enabled_at: enabled ? new Date().toISOString() : null,
        disabled_at: enabled ? null : new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'company_id,feature_name'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/admin/settings')
    revalidatePath('/admin/features')
    
    return { 
      success: true, 
      data: feature,
      message: `Feature ${featureName} ${enabled ? 'enabled' : 'disabled'} successfully` 
    }
  } catch (error) {
    console.error('Error toggling feature:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to toggle feature' 
    }
  }
}

// Initialize default features for a new company
export async function initializeCompanyFeatures(companyId: string, subscriptionPlan: string = 'basic') {
  const supabase = await createClient()
  
  try {
    const defaultFeatures = [
      { name: 'real_time_tracking', basicPlan: false, premiumPlan: true },
      { name: 'advanced_analytics', basicPlan: false, premiumPlan: true },
      { name: 'customer_portal', basicPlan: true, premiumPlan: true },
      { name: 'expense_management', basicPlan: true, premiumPlan: true },
      { name: 'document_management', basicPlan: true, premiumPlan: true },
      { name: 'multi_currency', basicPlan: false, premiumPlan: true },
      { name: 'mobile_app', basicPlan: false, premiumPlan: true },
      { name: 'api_access', basicPlan: false, premiumPlan: true },
      { name: 'custom_reports', basicPlan: false, premiumPlan: true },
      { name: 'bulk_operations', basicPlan: false, premiumPlan: true }
    ]

    const featuresToInsert = defaultFeatures.map(feature => ({
      company_id: companyId,
      feature_name: feature.name,
      is_enabled: subscriptionPlan === 'trial' ? true : 
                 subscriptionPlan === 'premium' ? feature.premiumPlan : feature.basicPlan,
      enabled_at: (subscriptionPlan === 'trial' || 
                  (subscriptionPlan === 'premium' && feature.premiumPlan) ||
                  (subscriptionPlan === 'basic' && feature.basicPlan)) ? new Date().toISOString() : null
    }))

    const { error } = await supabase
      .from('feature_toggles')
      .insert(featuresToInsert)

    if (error) {
      throw error
    }

    return { success: true, message: 'Default features initialized' }
  } catch (error) {
    console.error('Error initializing company features:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize features'
    }
  }
}

// Update features based on subscription plan change
export async function updateFeaturesForSubscription(companyId: string, newPlan: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Only super admins can update subscription features
    if (profile?.role !== 'super_admin') {
      throw new Error('Super admin access required')
    }

    const planFeatures = {
      basic: ['customer_portal', 'expense_management', 'document_management'],
      premium: [
        'customer_portal', 'expense_management', 'document_management',
        'real_time_tracking', 'advanced_analytics', 'multi_currency',
        'mobile_app', 'api_access', 'custom_reports', 'bulk_operations'
      ],
      trial: [
        'customer_portal', 'expense_management', 'document_management',
        'real_time_tracking', 'advanced_analytics', 'multi_currency',
        'mobile_app', 'api_access', 'custom_reports', 'bulk_operations'
      ]
    }

    const enabledFeatures = planFeatures[newPlan as keyof typeof planFeatures] || planFeatures.basic

    // Get current features
    const { data: currentFeatures } = await supabase
      .from('feature_toggles')
      .select('feature_name, is_enabled')
      .eq('company_id', companyId)

    if (!currentFeatures) {
      // Initialize features if none exist
      return await initializeCompanyFeatures(companyId, newPlan)
    }

    // Update features based on new plan
    const updates = currentFeatures.map(feature => {
      const shouldBeEnabled = enabledFeatures.includes(feature.feature_name)
      return {
        company_id: companyId,
        feature_name: feature.feature_name,
        is_enabled: shouldBeEnabled,
        enabled_at: shouldBeEnabled ? new Date().toISOString() : null,
        disabled_at: shouldBeEnabled ? null : new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })

    const { error } = await supabase
      .from('feature_toggles')
      .upsert(updates, { onConflict: 'company_id,feature_name' })

    if (error) {
      throw error
    }

    return { 
      success: true, 
      message: `Features updated for ${newPlan} subscription plan` 
    }
  } catch (error) {
    console.error('Error updating subscription features:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update subscription features'
    }
  }
}
