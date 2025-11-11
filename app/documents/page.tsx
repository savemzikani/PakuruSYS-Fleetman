import { redirect } from "next/navigation"

import { DocumentUploadForm } from "@/components/documents/document-upload-form"
import { DocumentTable } from "@/components/documents/document-table"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import type { Document } from "@/lib/types/database"

import { DOCUMENT_MAX_FILE_SIZE_BYTES, DOCUMENT_TYPES } from "./actions"

type DocumentRow = Pick<Document, "id" | "document_type" | "file_name" | "file_size" | "created_at"> & {
  load?: { load_number?: string | null } | null
  invoice?: { invoice_number?: string | null } | null
}

type SelectOption = {
  id: string
  label: string
}

export default async function DocumentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, company_id, first_name, role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    redirect("/auth/login")
  }

  if (!profile.company_id) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>No company association</CardTitle>
            <CardDescription>
              You need to be linked to a company before you can manage documents. Please contact your administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const companyId = profile.company_id

  const [documentsResponse, loadsResponse, invoicesResponse] = await Promise.all([
    supabase
      .from("documents")
      .select(
        `
        id,
        document_type,
        file_name,
        file_size,
        created_at,
        load:loads(load_number),
        invoice:invoices(invoice_number)
      `,
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("loads")
      .select("id, load_number")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("invoices")
      .select("id, invoice_number")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  const documents = (documentsResponse.data ?? []) as DocumentRow[]

  type LoadRecord = { id: string; load_number: string | null }
  const loadRecords = (loadsResponse.data ?? []) as LoadRecord[]
  const loadOptions: SelectOption[] = loadRecords
    .filter((load): load is LoadRecord & { load_number: string } => typeof load.load_number === "string")
    .map((load) => ({ id: load.id, label: load.load_number }))

  type InvoiceRecord = { id: string; invoice_number: string | null }
  const invoiceRecords = (invoicesResponse.data ?? []) as InvoiceRecord[]
  const invoiceOptions: SelectOption[] = invoiceRecords
    .filter(
      (invoice): invoice is InvoiceRecord & { invoice_number: string } => typeof invoice.invoice_number === "string",
    )
    .map((invoice) => ({ id: invoice.id, label: invoice.invoice_number }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground">
          Upload and manage bills of lading, proof of delivery, customs paperwork, and other compliance documents.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <DocumentUploadForm
          documentTypes={Array.from(DOCUMENT_TYPES)}
          loadOptions={loadOptions}
          invoiceOptions={invoiceOptions}
          maxFileSizeBytes={DOCUMENT_MAX_FILE_SIZE_BYTES}
        />

        <DocumentTable
          documents={documents.map((doc) => ({
            id: doc.id,
            documentType: doc.document_type,
            fileName: doc.file_name,
            fileSize: doc.file_size ?? null,
            createdAt: doc.created_at,
            loadNumber: doc.load?.load_number ?? null,
            invoiceNumber: doc.invoice?.invoice_number ?? null,
          }))}
        />
      </div>
    </div>
  )
}
