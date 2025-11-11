import type { ReactNode } from "react"

import { DashboardShell } from "@/components/layouts/dashboard-shell"
import { DriverModalsProvider } from "@/components/drivers/driver-modals-provider"

export default function DriversLayout({ children }: { children: ReactNode }) {
  return (
    <DriverModalsProvider>
      <DashboardShell>{children}</DashboardShell>
    </DriverModalsProvider>
  )
}
