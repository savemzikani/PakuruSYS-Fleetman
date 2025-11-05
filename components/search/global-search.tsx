"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface SearchResult {
  id: string
  type: "load" | "vehicle" | "driver" | "customer"
  title: string
  subtitle?: string
  url: string
}

interface GlobalSearchProps {
  onOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function GlobalSearch({ onOpen = false, onOpenChange }: GlobalSearchProps) {
  const [open, setOpen] = useState(onOpen)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
    if (newOpen) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        handleOpenChange(!open)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery)
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Mock search results - replace with actual API call
    const mockResults: SearchResult[] = [
      {
        id: "1",
        type: "load",
        title: "Load #LD-001",
        subtitle: "New York → Boston",
        url: "/loads/1",
      },
      {
        id: "2",
        type: "vehicle",
        title: "Vehicle TR-001",
        subtitle: "Truck - Available",
        url: "/vehicles/2",
      },
      {
        id: "3",
        type: "driver",
        title: "John Driver",
        subtitle: "Active Driver",
        url: "/drivers/3",
      },
    ].filter((result) => result.title.toLowerCase().includes(searchQuery.toLowerCase()))

    setResults(mockResults)
    setLoading(false)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "load":
        return "bg-blue-100 text-blue-800"
      case "vehicle":
        return "bg-purple-100 text-purple-800"
      case "driver":
        return "bg-green-100 text-green-800"
      case "customer":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleSelectResult = (url: string) => {
    router.push(url)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0 max-w-xl">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Global Search</DialogTitle>
        </DialogHeader>

        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search loads, vehicles, drivers, customers..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
          </div>
        </div>

        <Separator />

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {query ? "No results found" : "Start typing to search..."}
            </div>
          ) : (
            <div className="divide-y">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectResult(result.url)}
                  className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{result.title}</p>
                    {result.subtitle && <p className="text-xs text-muted-foreground mt-1">{result.subtitle}</p>}
                  </div>
                  <Badge className={getTypeColor(result.type)}>{result.type}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div className="px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>Press Cmd+K to open search</span>
          <span>ESC to close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
