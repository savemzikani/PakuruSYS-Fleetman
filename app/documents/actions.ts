"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

export const DOCUMENT_TYPES = ["invoice", "pod", "customs", "permit", "insurance", "other"] as const
export const DOCUMENT_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25MB limit
export const DOCUMENT_ALLOWED_ROLES = new Set(["super_admin", "company_admin", "manager", "dispatcher"])

const uploadDocumentSchema = z.object({
  document_type: z.enum(DOCUMENT_TYPES),
  load_id: z.string().uuid().optional().nullable(),
  invoice_id: z.string().uuid().optional().nullable(),
})

export interface DocumentActionResult {
  success: boolean
  error?: string
  documentId?: string
}

export interface DocumentDownloadResult {
  success: boolean
  error?: string
  url?: string
}

async function getAuthorizedContext() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" as const }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, company_id, role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return { error: "Profile not found" as const }
  }

  if (!DOCUMENT_ALLOWED_ROLES.has(profile.role)) {
    return { error: "Insufficient permissions" as const }
  }

  if (!profile.company_id) {
    return { error: "No company context" as const }
  }

  return { supabase, profile }
}

function sanitizeFilename(filename: string) {
  const name = filename.trim().replace(/[^a-zA-Z0-9._-]/g, "_")
  if (!name) return `document-${Date.now()}`
  return name.length > 120 ? name.slice(-120) : name
}

function getBucketName() {
  return process.env.SUPABASE_STORAGE_DOCUMENTS_BUCKET ?? "documents"
}

export async function uploadDocument(
  _prevState: DocumentActionResult | undefined,
  formData: FormData,
): Promise<DocumentActionResult> {
  const bucketName = getBucketName()

  if (!bucketName) {
    console.error("[document-upload] Missing storage bucket name")
    return { success: false, error: "Storage bucket not configured" }
  }

  const documentTypeValue = formData.get("document_type")
  const loadIdValue = formData.get("load_id")
  const invoiceIdValue = formData.get("invoice_id")
  const file = formData.get("file")

  const parsed = uploadDocumentSchema.safeParse({
    document_type: typeof documentTypeValue === "string" ? documentTypeValue : undefined,
    load_id: typeof loadIdValue === "string" && loadIdValue.length > 0 ? loadIdValue : null,
    invoice_id: typeof invoiceIdValue === "string" && invoiceIdValue.length > 0 ? invoiceIdValue : null,
  })

  if (!parsed.success) {
    console.error("[document-upload] Validation failure", parsed.error.flatten())
    return { success: false, error: "Invalid document metadata" }
  }

  if (!(file instanceof File)) {
    return { success: false, error: "Document file is required" }
  }

  if (file.size > DOCUMENT_MAX_FILE_SIZE_BYTES) {
    return { success: false, error: "File is too large" }
  }

  const context = await getAuthorizedContext()

  if ("error" in context) {
    return { success: false, error: context.error }
  }

  const { supabase, profile } = context

  const loadId = parsed.data.load_id
  const invoiceId = parsed.data.invoice_id

  if (loadId) {
    const { data: loadRecord } = await supabase
      .from("loads")
      .select("id")
      .eq("id", loadId)
      .eq("company_id", profile.company_id)
      .maybeSingle()

    if (!loadRecord) {
      return { success: false, error: "Load not found" }
    }
  }

  if (invoiceId) {
    const { data: invoiceRecord } = await supabase
      .from("invoices")
      .select("id")
      .eq("id", invoiceId)
      .eq("company_id", profile.company_id)
      .maybeSingle()

    if (!invoiceRecord) {
      return { success: false, error: "Invoice not found" }
    }
  }

  const sanitizedName = sanitizeFilename(file.name || "document")
  const objectKey = `${profile.company_id}/${randomUUID()}-${sanitizedName}`

  const fileBuffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage.from(bucketName).upload(objectKey, fileBuffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  })

  if (uploadError) {
    console.error("[document-upload] Storage upload failed", uploadError)
    return { success: false, error: "Failed to store document" }
  }

  const { data: insertData, error: insertError } = await supabase
    .from("documents")
    .insert({
      company_id: profile.company_id,
      load_id: loadId,
      invoice_id: invoiceId,
      document_type: parsed.data.document_type,
      file_name: sanitizedName,
      file_path: objectKey,
      file_size: file.size,
      mime_type: file.type || "application/octet-stream",
      uploaded_by: profile.id,
    })
    .select("id")
    .single()

  if (insertError || !insertData?.id) {
    console.error("[document-upload] Failed to persist document record", insertError)
    // Attempt to clean up the uploaded file to avoid orphaned storage objects
    await supabase.storage.from(bucketName).remove([objectKey]).catch(() => undefined)
    return { success: false, error: "Failed to save document" }
  }

  revalidatePath("/documents")

  return { success: true, documentId: insertData.id as string }
}

export async function getDocumentDownloadUrl(documentId: string): Promise<DocumentDownloadResult> {
  if (!documentId) {
    return { success: false, error: "Document id required" }
  }

  const bucketName = getBucketName()

  const context = await getAuthorizedContext()

  if ("error" in context) {
    return { success: false, error: context.error }
  }

  const { supabase, profile } = context

  const { data: documentRecord, error: documentError } = await supabase
    .from("documents")
    .select("id, file_path, file_name")
    .eq("id", documentId)
    .eq("company_id", profile.company_id)
    .maybeSingle()

  if (documentError || !documentRecord) {
    return { success: false, error: "Document not found" }
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(documentRecord.file_path, 60)

  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error("[document-download] Failed to create signed URL", signedUrlError)
    return { success: false, error: "Unable to generate download link" }
  }

  return { success: true, url: signedUrlData.signedUrl }
}
