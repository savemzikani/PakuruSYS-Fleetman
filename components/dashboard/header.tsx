"use client"

import { Button } from "@/components/ui/button"
import { Menu, Search, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Profile } from "@/lib/types/database"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { GlobalSearch } from "@/components/search/global-search"
import { NotificationPanel } from "@/components/notifications/notification-panel"
import { useState } from "react"

interface HeaderProps {
  user: Profile
  onMenuClick?: () => void
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const userInitials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="sm" className="md:hidden" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
          <button
            onClick={() => setSearchOpen(true)}
            className="relative hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border hover:bg-muted/80 transition-colors w-64 text-sm text-muted-foreground"
          >
            <Search className="h-4 w-4" />
            <span>Search loads, vehicles...</span>
            <kbd className="absolute right-2 ml-auto text-xs bg-background border border-border px-2 py-1 rounded hidden md:block">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <NotificationPanel
            notifications={[
              {
                id: "1",
                type: "info",
                title: "Load Delivered",
                message: "Load #LD-001 has been successfully delivered",
                timestamp: new Date(),
                read: false,
              },
            ]}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium leading-none">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize mt-1">{user.role.replace("_", " ")}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm font-medium">
                {user.first_name} {user.last_name}
              </div>
              <div className="px-2 py-1 text-xs text-muted-foreground capitalize">{user.role.replace("_", " ")}</div>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
