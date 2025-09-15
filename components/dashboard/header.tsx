"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bell, Menu, Search } from "lucide-react"
import type { Profile } from "@/lib/types/database"

interface HeaderProps {
  user: Profile
  onMenuClick?: () => void
}

export function Header({ user, onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="md:hidden" onClick={onMenuClick}>
          <Menu className="h-4 w-4" />
        </Button>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search loads, vehicles, drivers..." className="w-80 pl-10" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="text-right">
          <p className="text-sm font-medium">
            {user.first_name} {user.last_name}
          </p>
          <p className="text-xs text-muted-foreground capitalize">{user.role.replace("_", " ")}</p>
        </div>
      </div>
    </header>
  )
}
