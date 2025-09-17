"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Document, DocumentType } from "@/lib/types/database"

// Upload document
export async function uploadDocument(formData: FormData) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Check permissions
    if (!['super_admin', 'company_admin', 'manager', 'dispatcher'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Extract form data
    const file = formData.get('file') as File
    const document_type = formData.get('document_type') as DocumentType
    const load_id = formData.get('load_id') as string
    const invoice_id = formData.get('invoice_id') as string
    const quote_id = formData.get('quote_id') as string

    if (!file) {
      throw new Error('No file provided')
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit')
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!allowedTypes.includes(file.type)) {
      throw new Error('File type not supported')
    }

    // Generate unique file name
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = `documents/${profile.company_id}/${fileName}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw uploadError
    }

    // Create document record
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .insert({
        company_id: profile.company_id,
        load_id: load_id || null,
        invoice_id: invoice_id || null,
        quote_id: quote_id || null,
        document_type,
        file_name: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id
      })
      .select()
      .single()

    if (documentError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('documents').remove([filePath])
      throw documentError
    }

    revalidatePath('/documents')
    if (load_id) revalidatePath(`/loads/${load_id}`)
    if (invoice_id) revalidatePath(`/financial/invoices/${invoice_id}`)
    if (quote_id) revalidatePath(`/quotes/${quote_id}`)

    return {
      success: true,
      data: document,
      message: `Document ${file.name} uploaded successfully`
    }
  } catch (error) {
    console.error('Error uploading document:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload document'
    }
  }
}

// Delete document
export async function deleteDocument(documentId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Check permissions
    if (!['super_admin', 'company_admin', 'manager'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Get document details
    const { data: document } = await supabase
      .from('documents')
      .select('file_name, file_path, load_id, invoice_id, quote_id')
      .eq('id', documentId)
      .eq('company_id', profile.company_id)
      .single()

    if (!document) {
      throw new Error('Document not found')
    }

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path])

    if (storageError) {
      console.warn('Failed to delete file from storage:', storageError)
    }

    // Delete document record
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      throw deleteError
    }

    revalidatePath('/documents')
    if (document.load_id) revalidatePath(`/loads/${document.load_id}`)
    if (document.invoice_id) revalidatePath(`/financial/invoices/${document.invoice_id}`)
    if (document.quote_id) revalidatePath(`/quotes/${document.quote_id}`)

    return {
      success: true,
      message: `Document ${document.file_name} deleted successfully`
    }
  } catch (error) {
    console.error('Error deleting document:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete document'
    }
  }
}

// Get documents for a company
export async function getDocuments(filters?: {
  document_type?: DocumentType
  load_id?: string
  invoice_id?: string
  quote_id?: string
}) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Build query
    let query = supabase
      .from('documents')
      .select(`
        *,
        load:loads(load_number),
        invoice:invoices(invoice_number),
        quote:quotes(quote_number),
        uploader:profiles(first_name, last_name)
      `)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.document_type) {
      query = query.eq('document_type', filters.document_type)
    }
    if (filters?.load_id) {
      query = query.eq('load_id', filters.load_id)
    }
    if (filters?.invoice_id) {
      query = query.eq('invoice_id', filters.invoice_id)
    }
    if (filters?.quote_id) {
      query = query.eq('quote_id', filters.quote_id)
    }

    const { data: documents, error } = await query

    if (error) {
      throw error
    }

    return { success: true, data: documents }
  } catch (error) {
    console.error('Error fetching documents:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch documents'
    }
  }
}

// Get document download URL
export async function getDocumentDownloadUrl(documentId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Get document details
    const { data: document } = await supabase
      .from('documents')
      .select('file_path, file_name')
      .eq('id', documentId)
      .eq('company_id', profile.company_id)
      .single()

    if (!document) {
      throw new Error('Document not found')
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.file_path, 3600)

    if (urlError) {
      throw urlError
    }

    return {
      success: true,
      data: {
        url: signedUrl.signedUrl,
        fileName: document.file_name
      }
    }
  } catch (error) {
    console.error('Error getting document download URL:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get download URL'
    }
  }
}

// Update document metadata
export async function updateDocument(documentId: string, formData: FormData) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Check permissions
    if (!['super_admin', 'company_admin', 'manager'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Verify document exists
    const { data: existingDocument } = await supabase
      .from('documents')
      .select('id, file_name')
      .eq('id', documentId)
      .eq('company_id', profile.company_id)
      .single()

    if (!existingDocument) {
      throw new Error('Document not found')
    }

    // Extract form data
    const document_type = formData.get('document_type') as DocumentType
    const load_id = formData.get('load_id') as string
    const invoice_id = formData.get('invoice_id') as string
    const quote_id = formData.get('quote_id') as string

    // Update document
    const { data: document, error } = await supabase
      .from('documents')
      .update({
        document_type,
        load_id: load_id || null,
        invoice_id: invoice_id || null,
        quote_id: quote_id || null
      })
      .eq('id', documentId)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/documents')
    if (load_id) revalidatePath(`/loads/${load_id}`)
    if (invoice_id) revalidatePath(`/financial/invoices/${invoice_id}`)
    if (quote_id) revalidatePath(`/quotes/${quote_id}`)

    return {
      success: true,
      data: document,
      message: `Document ${existingDocument.file_name} updated successfully`
    }
  } catch (error) {
    console.error('Error updating document:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update document'
    }
  }
}

// Get document statistics
export async function getDocumentStats() {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Get document statistics
    const { data: documents } = await supabase
      .from('documents')
      .select('document_type, file_size')
      .eq('company_id', profile.company_id)

    if (!documents) {
      return {
        success: true,
        data: {
          totalDocuments: 0,
          totalSize: 0,
          byType: {}
        }
      }
    }

    const stats = {
      totalDocuments: documents.length,
      totalSize: documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0),
      byType: documents.reduce((acc, doc) => {
        acc[doc.document_type] = (acc[doc.document_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error('Error fetching document stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch document statistics'
    }
  }
}
