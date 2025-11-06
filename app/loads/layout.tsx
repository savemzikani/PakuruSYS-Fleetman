import type { ReactNode } from "react"

import { DashboardShell } from "@/components/layouts/dashboard-shell"
import { LoadModalsProvider } from "@/components/loads/load-modals-provider"

export default function LoadsLayout({ children }: { children: ReactNode }) {
  return (
    <LoadModalsProvider>
      <DashboardShell>{children}</DashboardShell>
    </LoadModalsProvider>
  )
}
