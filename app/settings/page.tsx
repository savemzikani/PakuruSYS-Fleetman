import { redirect } from "next/navigation"

import { GeneralSettingsForm } from "@/components/settings/general-settings-form"
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form"
import { SecuritySettingsForm } from "@/components/settings/security-settings-form"
import { TeamMembersTable } from "@/components/settings/team-members-table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/server"
import { Settings, Bell, Lock, Users } from "lucide-react"

type NotificationPreferencesRow = {
  load_updates: boolean | null
  invoice_events: boolean | null
  maintenance_alerts: boolean | null
  escalation_email: string | null
}

type SecuritySettingsRow = {
  require_mfa: boolean | null
  password_rotation_days: number | null
  idle_timeout_minutes: number | null
}

type TeamMemberRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string
  is_active: boolean | null
  last_login_at: string | null
}

type ProfileWithCompanyRow = {
  role: string
  company_id: string | null
  company: {
    id: string
    name: string | null
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    country: string | null
    postal_code: string | null
  } | null
}

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  const {
    data: profileData,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      `role,
       company_id,
       company:companies(
        id,
        name,
        email,
        phone,
        address,
        city,
        country,
        postal_code
       )`
    )
    .eq("id", user.id)
    .single()

  const profile = profileData as ProfileWithCompanyRow | null

  if (profileError || !profile) {
    console.error("[settings] Failed to load profile", profileError)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and application settings</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>We could not load your profile. Please refresh the page.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!profile.company_id || !profile.company) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and application settings</p>
        </div>
        <Alert>
          <AlertDescription>
            You are not currently associated with a company. Please contact your administrator for access to
            organization settings.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const canEdit = profile.role === "company_admin" || profile.role === "manager"

  let notificationData: NotificationPreferencesRow | null = null
  let securityData: SecuritySettingsRow | null = null
  let teamMembers: TeamMemberRow[] = []

  if (profile.company?.id) {
    const { data } = await supabase
      .from("notification_preferences")
      .select("load_updates, invoice_events, maintenance_alerts, escalation_email")
      .eq("company_id", profile.company.id)
      .maybeSingle<NotificationPreferencesRow>()

    notificationData = data ?? null

    const { data: securitySettings } = await supabase
      .from("company_security_settings")
      .select("require_mfa, password_rotation_days, idle_timeout_minutes")
      .eq("company_id", profile.company.id)
      .maybeSingle<SecuritySettingsRow>()

    securityData = securitySettings ?? null

    const { data: memberRows, error: membersError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, is_active, last_login_at")
      .eq("company_id", profile.company.id)
      .order("first_name", { ascending: true, nullsFirst: false })
      .order("last_name", { ascending: true, nullsFirst: false })

    if (membersError) {
      console.error("[settings] Failed to load team members", membersError)
    } else {
      teamMembers = memberRows ?? []
    }
  }

  const initialGeneralSettings = {
    name: profile.company.name ?? "",
    email: profile.company.email ?? null,
    phone: profile.company.phone ?? null,
    address: profile.company.address ?? null,
    city: profile.company.city ?? null,
    country: profile.company.country ?? null,
    postalCode: profile.company.postal_code ?? null,
  }

  const initialNotificationPreferences = {
    loadUpdates: notificationData?.load_updates ?? true,
    invoiceEvents: notificationData?.invoice_events ?? true,
    maintenanceAlerts: notificationData?.maintenance_alerts ?? true,
    escalationEmail: notificationData?.escalation_email ?? null,
  }

  const initialSecuritySettings = {
    requireMfa: securityData?.require_mfa ?? false,
    passwordRotationDays: securityData?.password_rotation_days ?? 0,
    idleTimeoutMinutes: securityData?.idle_timeout_minutes ?? 0,
  }

  const initialTeamMembers = teamMembers.map((member) => {
    const nameParts = [member.first_name?.trim(), member.last_name?.trim()].filter(Boolean)
    const combinedName = nameParts.join(" ")

    return {
      id: member.id,
      name: combinedName || member.email || "Unknown user",
      email: member.email,
      role: member.role,
      isActive: member.is_active ?? false,
      lastLoginAt: member.last_login_at,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and application settings</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Update core company information visible across the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <GeneralSettingsForm initialValues={initialGeneralSettings} canEdit={canEdit} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Control how your organization receives operational alerts.</CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationPreferencesForm initialValues={initialNotificationPreferences} canEdit={canEdit} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage organization-level security requirements.</CardDescription>
            </CardHeader>
            <CardContent>
              <SecuritySettingsForm initialValues={initialSecuritySettings} canEdit={canEdit} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Review team access and invite new members.</CardDescription>
            </CardHeader>
            <CardContent>
              <TeamMembersTable members={initialTeamMembers} canEdit={canEdit} currentUserId={user.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
