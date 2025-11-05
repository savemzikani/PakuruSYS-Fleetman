"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Plus, Users } from "lucide-react"
import Link from "next/link"

export default function DriversPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Drivers Management</h1>
          <p className="text-muted-foreground mt-1">Manage your driver fleet and assignments</p>
        </div>
        <Link href="/drivers/add">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Driver
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Drivers
          </CardTitle>
          <CardDescription>Manage your driver roster</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Driver management coming soon</p>
        </CardContent>
      </Card>
    </div>
  )
}
