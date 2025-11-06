"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import * as SelectPrimitive from "@radix-ui/react-select"
import { SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type InvoiceFilterCustomer = {
  id: string
  name: string | null
}

interface InvoiceFiltersProps {
  search?: string
  status?: string
  customer?: string
  customers: InvoiceFilterCustomer[]
}

const statusOptions = [
  { label: "All Status", value: "all" },
  { label: "Paid", value: "paid" },
  { label: "Pending", value: "pending" },
  { label: "Overdue", value: "overdue" },
  { label: "Cancelled", value: "cancelled" },
]

export function InvoiceFilters({ search = "", status = "all", customer = "all", customers }: InvoiceFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const paramsString = searchParams?.toString() ?? ""

  const [searchValue, setSearchValue] = useState(search)
  const [statusValue, setStatusValue] = useState(status || "all")
  const [customerValue, setCustomerValue] = useState(customer || "all")
  const [, startTransition] = useTransition()

  useEffect(() => {
    setSearchValue(search)
  }, [search])

  useEffect(() => {
    setStatusValue(status || "all")
  }, [status])

  useEffect(() => {
    setCustomerValue(customer || "all")
  }, [customer])

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(paramsString)
      const normalizedValue = value.trim()
      const currentValue = params.get(key) ?? ""

      if (!normalizedValue || normalizedValue === "all") {
        if (!params.has(key)) {
          return
        }
        params.delete(key)
      } else {
        if (currentValue === normalizedValue) {
          return
        }
        params.set(key, normalizedValue)
      }

      startTransition(() => {
        const queryString = params.toString()
        router.replace(queryString ? `${pathname}?${queryString}` : pathname)
      })
    },
    [paramsString, pathname, router],
  )

  useEffect(() => {
    const handler = setTimeout(() => updateParam("q", searchValue), 350)
    return () => clearTimeout(handler)
  }, [searchValue, updateParam])

  return (
    <div className="flex flex-wrap gap-4">
      <div className="relative min-w-64 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by invoice, customer, load..."
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          className="pl-10"
        />
      </div>

      <SelectPrimitive.Root
        value={statusValue}
        onValueChange={(value) => {
          setStatusValue(value)
          updateParam("status", value)
        }}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectPrimitive.Root>

      <SelectPrimitive.Root
        value={customerValue}
        onValueChange={(value) => {
          setCustomerValue(value)
          updateParam("customer", value)
        }}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by customer" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Customers</SelectItem>
          {customers.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name ?? "Unnamed Customer"}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectPrimitive.Root>
    </div>
  )
}
