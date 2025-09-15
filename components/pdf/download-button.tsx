"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useState } from "react"

interface DownloadButtonProps {
  url: string
  filename: string
  children?: React.ReactNode
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
}

export function DownloadButton({ url, filename, children, variant = "outline", size = "sm" }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Download failed")
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error("[v0] Download error:", error)
      alert("Failed to download file. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button variant={variant} size={size} onClick={handleDownload} disabled={isDownloading}>
      <Download className="h-4 w-4 mr-1" />
      {isDownloading ? "Downloading..." : children || "Download PDF"}
    </Button>
  )
}
