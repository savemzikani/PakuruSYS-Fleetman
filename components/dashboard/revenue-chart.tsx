"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type RevenuePoint = {
  month: string
  revenue: number
}

type DashboardRevenueChartProps = {
  data: RevenuePoint[]
}

export function DashboardRevenueChart({ data }: DashboardRevenueChartProps) {
  if (!data || data.length === 0) {
    return <div className="flex h-[300px] items-center justify-center text-muted-foreground">No revenue data available</div>
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value: number) => [`$${Number(value).toLocaleString()}`, "Revenue"]} />
          <Bar dataKey="revenue" fill="hsl(var(--primary))" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
