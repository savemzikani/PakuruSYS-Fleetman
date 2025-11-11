"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { uploadDocument } from "@/app/documents/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

interface SelectOption {
  id: string
  label: string
}

interface DocumentUploadFormProps {
  documentTypes: string[]
  loadOptions: SelectOption[]
  invoiceOptions: SelectOption[]
  maxFileSizeBytes: number
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export function DocumentUploadForm({
  documentTypes,
  loadOptions,
  invoiceOptions,
  maxFileSizeBytes,
}: DocumentUploadFormProps) {
  const initialDocumentType = documentTypes[0] ?? ""
  const [documentType, setDocumentType] = useState(initialDocumentType)
  const [loadId, setLoadId] = useState("")
  const [invoiceId, setInvoiceId] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const formattedMaxSize = useMemo(() => formatBytes(maxFileSizeBytes), [maxFileSizeBytes])

  const canSubmit = documentType !== ""

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!canSubmit) {
        setErrorMessage("Select a document type before uploading.")
        return
      }

      setErrorMessage(null)

      const form = event.currentTarget
      const formData = new FormData(form)

      startTransition(async () => {
        const result = await uploadDocument(undefined, formData)

        if (result.success) {
          toast.success("Document uploaded successfully")
          form.reset()
          setLoadId("")
          setInvoiceId("")
          setDocumentType(documentTypes[0] ?? "")
          router.refresh()
        } else if (result.error) {
          toast.error(result.error)
          setErrorMessage(result.error)
        }
      })
    },
    [canSubmit, documentTypes, router],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload a document</CardTitle>
        <CardDescription>Accepted formats depend on your selection. Maximum size: {formattedMaxSize}.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
          <div className="space-y-2">
            <Label htmlFor="document-type">Document type *</Label>
            <Select value={documentType} onValueChange={setDocumentType} disabled={documentTypes.length === 0}>
              <SelectTrigger id="document-type">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.length === 0 ? (
                  <SelectItem value="" disabled>
                    No document types configured
                  </SelectItem>
                ) : null}
                {documentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="document_type" value={documentType} readOnly />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="load-id">Related load (optional)</Label>
              <Select value={loadId} onValueChange={setLoadId}>
                <SelectTrigger id="load-id">
                  <SelectValue placeholder="Select load" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No load</SelectItem>
                  {loadOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="load_id" value={loadId} readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice-id">Related invoice (optional)</Label>
              <Select value={invoiceId} onValueChange={setInvoiceId}>
                <SelectTrigger id="invoice-id">
                  <SelectValue placeholder="Select invoice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No invoice</SelectItem>
                  {invoiceOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="invoice_id" value={invoiceId} readOnly />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="document-file">Document file *</Label>
            <Input id="document-file" type="file" name="file" required accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx" />
            <p className="text-xs text-muted-foreground">Maximum upload size: {formattedMaxSize}</p>
          </div>

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

          <Button type="submit" disabled={isPending || !canSubmit} className="w-full">
            {isPending ? "Uploading…" : "Upload Document"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
