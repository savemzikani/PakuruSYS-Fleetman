import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"

interface ActivityItem {
  id: string
  type: "load" | "vehicle" | "driver" | "invoice"
  title: string
  description: string
  timestamp: string
  status?: string
}

interface RecentActivityProps {
  activities: ActivityItem[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "delivered":
      case "paid":
      case "active":
        return "bg-green-100 text-green-800"
      case "in_transit":
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
      case "overdue":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start justify-between space-x-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
              <p className="text-sm text-muted-foreground">{activity.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>
            {activity.status && (
              <Badge variant="secondary" className={getStatusColor(activity.status)}>
                {activity.status.replace("_", " ")}
              </Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
