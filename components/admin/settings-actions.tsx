"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  performSystemBackup, 
  testEmailService, 
  performSystemHealthCheck,
  toggleMaintenanceMode,
  updateSystemSetting
} from "@/lib/actions/super-admin"
import { Database, Mail, Server, Settings, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface SettingsActionsProps {
  initialSettings?: Record<string, any>
}

export function SettingsActions({ initialSettings = {} }: SettingsActionsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  const [settings, setSettings] = useState(initialSettings)

  const handleSystemBackup = async () => {
    setLoading("backup")
    try {
      const result = await performSystemBackup()
      if (result.success) {
        toast({
          title: "Backup Completed",
          description: result.message,
        })
      } else {
        toast({
          title: "Backup Failed",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform backup",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleEmailTest = async () => {
    setLoading("email")
    try {
      const result = await testEmailService()
      if (result.success) {
        toast({
          title: "Email Test Successful",
          description: result.message,
        })
      } else {
        toast({
          title: "Email Test Failed",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test email service",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleHealthCheck = async () => {
    setLoading("health")
    try {
      const result = await performSystemHealthCheck()
      if (result.success) {
        toast({
          title: "Health Check Complete",
          description: result.message,
        })
      } else {
        toast({
          title: "Health Check Failed",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform health check",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleMaintenanceToggle = async () => {
    const currentMode = settings.maintenance_mode || false
    setLoading("maintenance")
    try {
      const result = await toggleMaintenanceMode(!currentMode)
      if (result.success) {
        setSettings(prev => ({ ...prev, maintenance_mode: !currentMode }))
        toast({
          title: "Maintenance Mode Updated",
          description: result.message,
        })
      } else {
        toast({
          title: "Update Failed",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle maintenance mode",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleSettingUpdate = async (key: string, value: any) => {
    setLoading(key)
    try {
      const result = await updateSystemSetting(key, value)
      if (result.success) {
        setSettings(prev => ({ ...prev, [key]: value }))
        toast({
          title: "Setting Updated",
          description: result.message,
        })
      } else {
        toast({
          title: "Update Failed",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">System Maintenance Mode</h4>
            <p className="text-sm text-muted-foreground">Enable to prevent user access during updates</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={settings.maintenance_mode ? "destructive" : "outline"}>
              {settings.maintenance_mode ? "Enabled" : "Disabled"}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={handleMaintenanceToggle}
              disabled={loading === "maintenance"}
            >
              {loading === "maintenance" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Toggle
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">New User Registration</h4>
            <p className="text-sm text-muted-foreground">Allow new users to register</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={settings.user_registration ? "secondary" : "outline"}>
              {settings.user_registration !== false ? "Enabled" : "Disabled"}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSettingUpdate("user_registration", !settings.user_registration)}
              disabled={loading === "user_registration"}
            >
              {loading === "user_registration" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Toggle
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Auto-approve Companies</h4>
            <p className="text-sm text-muted-foreground">Automatically approve new company applications</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={settings.auto_approve_companies ? "secondary" : "outline"}>
              {settings.auto_approve_companies ? "Enabled" : "Disabled"}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSettingUpdate("auto_approve_companies", !settings.auto_approve_companies)}
              disabled={loading === "auto_approve_companies"}
            >
              {loading === "auto_approve_companies" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Toggle
            </Button>
          </div>
        </div>
      </div>

      {/* System Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Button 
          variant="outline"
          onClick={handleSystemBackup}
          disabled={loading === "backup"}
        >
          {loading === "backup" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Database className="h-4 w-4 mr-2" />
          )}
          Backup Database
        </Button>

        <Button 
          variant="outline"
          onClick={handleEmailTest}
          disabled={loading === "email"}
        >
          {loading === "email" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Mail className="h-4 w-4 mr-2" />
          )}
          Test Email Service
        </Button>

        <Button 
          variant="outline"
          onClick={handleHealthCheck}
          disabled={loading === "health"}
        >
          {loading === "health" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Server className="h-4 w-4 mr-2" />
          )}
          System Health Check
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-red-600 hover:text-red-700">
              <Settings className="h-4 w-4 mr-2" />
              Reset System
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset System Settings</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all system settings to their default values. This action cannot be undone.
                Are you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  toast({
                    title: "System Reset",
                    description: "System reset functionality is not implemented yet for safety reasons.",
                    variant: "destructive",
                  })
                }}
              >
                Reset System
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
