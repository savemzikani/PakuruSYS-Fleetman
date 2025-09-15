"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Profile, UserRole } from "@/lib/types/database"
import { BarChart3, Building2, FileText, Home, LogOut, Package, Settings, Truck, Users, Wallet } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface SidebarProps {
  user: Profile
  className?: string
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    roles: ["super_admin", "company_admin", "manager", "dispatcher", "driver"],
  },
  {
    title: "Fleet Management",
    href: "/fleet",
    icon: Truck,
    roles: ["super_admin", "company_admin", "manager"],
  },
  {
    title: "Load Management",
    href: "/loads",
    icon: Package,
    roles: ["super_admin", "company_admin", "manager", "dispatcher"],
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Building2,
    roles: ["super_admin", "company_admin", "manager", "dispatcher"],
  },
  {
    title: "Drivers",
    href: "/drivers",
    icon: Users,
    roles: ["super_admin", "company_admin", "manager"],
  },
  {
    title: "Financial",
    href: "/financial",
    icon: Wallet,
    roles: ["super_admin", "company_admin", "manager"],
  },
  {
    title: "Documents",
    href: "/documents",
    icon: FileText,
    roles: ["super_admin", "company_admin", "manager", "dispatcher"],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["super_admin", "company_admin", "manager"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["super_admin", "company_admin"],
  },
]

export function Sidebar({ user, className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const filteredNavItems = navItems.filter((item) => item.roles.includes(user.role))

  return (
    <div className={cn("flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border", className)}>
      {/* Logo and Company */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <div className="flex items-center gap-2">
          <Truck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">SADC Logistics</h1>
            {user.company && <p className="text-xs text-muted-foreground">{user.company.name}</p>}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* User Info and Sign Out */}
      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 rounded-lg bg-muted p-3">
          <p className="text-sm font-medium text-foreground">
            {user.first_name} {user.last_name}
          </p>
          <p className="text-xs text-muted-foreground capitalize">{user.role.replace("_", " ")}</p>
        </div>
        <Button variant="outline" className="w-full justify-start gap-3 bg-transparent" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
