"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { getDocumentDownloadUrl } from "@/app/documents/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface DocumentRow {
  id: string
  documentType: string
  fileName: string
  fileSize: number | null
  createdAt: string
  loadNumber: string | null
  invoiceNumber: string | null
}

interface DocumentTableProps {
  documents: DocumentRow[]
}

function formatBytes(size: number | null) {
  if (!size) return "—"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let index = 0
  let value = size
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function formatDate(input: string) {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) {
    return "Unknown"
  }
  return date.toLocaleString()
}

export function DocumentTable({ documents }: DocumentTableProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [documents])

  const handleDownload = useCallback((documentId: string, fileName: string) => {
    startTransition(async () => {
      setDownloadingId(documentId)
      const result = await getDocumentDownloadUrl(documentId)

      if (result.success && result.url) {
        try {
          const anchor = document.createElement("a")
          anchor.href = result.url
          anchor.download = fileName
          document.body.appendChild(anchor)
          anchor.click()
          document.body.removeChild(anchor)
        } catch (error) {
          console.error("[document-download] Failed to start download", error)
          toast.error("Could not download document. Please try again.")
        }
      } else if (result.error) {
        toast.error(result.error)
      }

      setDownloadingId(null)
    })
  }, [])

  if (sortedDocuments.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No documents uploaded yet.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full table-auto text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="px-4 py-3 font-medium">File</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Linked To</th>
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 font-medium">Uploaded</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedDocuments.map((document) => {
            const isDownloading = isPending && downloadingId === document.id
            const links: string[] = []
            if (document.loadNumber) {
              links.push(`Load ${document.loadNumber}`)
            }
            if (document.invoiceNumber) {
              links.push(`Invoice ${document.invoiceNumber}`)
            }
            return (
              <tr key={document.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{document.fileName}</span>
                    <span className="text-xs text-muted-foreground">ID: {document.id}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{document.documentType.toUpperCase()}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{links.length > 0 ? links.join(", ") : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatBytes(document.fileSize)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(document.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDownloading}
                    onClick={() => handleDownload(document.id, document.fileName)}
                  >
                    {isDownloading ? "Downloading…" : "Download"}
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
