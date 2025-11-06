import type { ReactNode } from "react"

import { DashboardShell } from "@/components/layouts/dashboard-shell"

export default function CustomersLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
