import type { ReactNode } from "react"

import { DashboardShell } from "@/components/layouts/dashboard-shell"

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
