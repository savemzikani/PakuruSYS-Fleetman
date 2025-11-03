import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideReact } from "lucide-react"
import type { ComponentType } from "react"

interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: ComponentType<{ className?: string }>
  className?: string
}

export function MetricCard({ title, value, change, changeType = "neutral", icon: Icon, className }: MetricCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p
            className={cn("text-xs", {
              "text-green-600": changeType === "positive",
              "text-red-600": changeType === "negative",
              "text-muted-foreground": changeType === "neutral",
            })}
          >
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
