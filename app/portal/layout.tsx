import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Customer Portal - SADC Logistics",
  description: "Track shipments, view invoices, and manage your logistics account",
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
