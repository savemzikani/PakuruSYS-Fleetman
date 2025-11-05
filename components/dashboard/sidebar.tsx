"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Profile, UserRole } from "@/lib/types/database"
import { BarChart3, Building2, Home, Package, Settings, Truck, Users, Wallet, ChevronDown } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface SidebarProps {
  user: Profile
  className?: string
}

interface NavItem {
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
  children?: NavItem[]
}

const Sidebar = ({ user, className }: SidebarProps) => {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: Home,
      roles: ["super_admin", "company_admin", "manager", "dispatcher", "driver"],
    },
    ...(user.role === "super_admin"
      ? [
          {
            title: "Admin Panel",
            href: "/admin",
            icon: Settings,
            roles: ["super_admin"],
          },
        ]
      : []),
    {
      title: "Operations",
      icon: Truck,
      roles: ["super_admin", "company_admin", "manager", "dispatcher"],
      children: [
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
      ],
    },
    {
      title: "Management",
      icon: Building2,
      roles: ["super_admin", "company_admin", "manager"],
      children: [
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
      ],
    },
    {
      title: "Financial",
      href: "/financial",
      icon: Wallet,
      roles: ["super_admin", "company_admin", "manager"],
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

  const filteredNavItems = navItems.filter((item) => item.roles.includes(user.role))

  const renderNavItem = (item: NavItem, depth = 0) => {
    const Icon = item.icon
    const isActive = pathname === item.href
    const hasChildren = item.children && item.children.length > 0
    const isOpen = openMenus[item.title]

    if (hasChildren) {
      return (
        <Collapsible key={item.title} open={isOpen} onOpenChange={() => toggleMenu(item.title)}>
          <CollapsibleTrigger asChild>
            <Button
              variant={isOpen ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-10",
                isOpen && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
              <ChevronDown className="h-4 w-4 ml-auto transition-transform duration-200" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pl-4 mt-1">
            {item.children?.map((child) => renderNavItem(child, depth + 1))}
          </CollapsibleContent>
        </Collapsible>
      )
    }

    return (
      <Link key={item.href} href={item.href || "#"}>
        <Button
          variant={isActive ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start gap-3 h-10",
            isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
            depth > 0 && "pl-8",
          )}
        >
          <Icon className="h-4 w-4" />
          {item.title}
        </Button>
      </Link>
    )
  }

  return (
    <div className={cn("flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border", className)}>
      {/* Logo and Company */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <div className="flex items-center gap-2">
          <Truck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">SADC Logistics</h1>
            {user.company && <p className="text-xs text-muted-foreground truncate">{user.company.name}</p>}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">{filteredNavItems.map((item) => renderNavItem(item))}</nav>

      {/* User Info */}
      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-sm font-medium text-foreground truncate">
            {user.first_name} {user.last_name}
          </p>
          <p className="text-xs text-muted-foreground capitalize">{user.role.replace("_", " ")}</p>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
