import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertCircle } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="space-y-2">
          <div className="flex justify-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">404</h1>
          <p className="text-lg text-muted-foreground">Page not found</p>
        </div>
        <p className="text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 bg-transparent" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
          <Button className="flex-1" asChild>
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
