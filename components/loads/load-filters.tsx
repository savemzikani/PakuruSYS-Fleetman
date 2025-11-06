"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type LoadFilterCustomer = {
  id: string
  name: string | null
}

type LoadFiltersProps = {
  search?: string
  status?: string
  customer?: string
  customers: LoadFilterCustomer[]
}

const statusOptions = [
  { label: "All Statuses", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Assigned", value: "assigned" },
  { label: "In Transit", value: "in_transit" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
]

export function LoadFilters({
  search = "",
  status = "all",
  customer = "all",
  customers,
}: LoadFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsString = searchParams?.toString() ?? ""

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
      const params = new URLSearchParams(searchParamsString)
      const normalizedValue = value.trim()
      const currentValue = params.get(key) ?? ""

      if (!normalizedValue || normalizedValue === "all") {
        if (!params.has(key)) return
        params.delete(key)
      } else {
        if (currentValue === normalizedValue) return
        params.set(key, normalizedValue)
      }

      startTransition(() => {
        const queryString = params.toString()
        router.replace(queryString ? `${pathname}?${queryString}` : pathname)
      })
    },
    [pathname, router, searchParamsString],
  )

  useEffect(() => {
    const handler = setTimeout(() => {
      updateParam("q", searchValue)
    }, 400)

    return () => clearTimeout(handler)
  }, [searchValue, updateParam])

  return (
    <div className="flex flex-wrap gap-4">
      <div className="relative min-w-64 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search by load number, customer, destination..."
          className="pl-10"
        />
      </div>
      <Select
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
      </Select>
      <Select
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
      </Select>
    </div>
  )
}
