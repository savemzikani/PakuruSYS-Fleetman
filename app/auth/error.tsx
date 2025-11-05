"use client"

import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error") || "Authentication failed"

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Authentication Error</CardTitle>
          </div>
          <CardDescription>Something went wrong</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground">{error}</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 bg-transparent" asChild>
              <Link href="/auth/login">Back to Login</Link>
            </Button>
            <Button className="flex-1" asChild>
              <Link href="/auth/register">Register</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
