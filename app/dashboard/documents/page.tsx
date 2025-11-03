import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Plus, Search, Download, Eye } from "lucide-react"
import Link from "next/link"
import type { Document } from "@/lib/types/database"

export default async function DocumentsPage() {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, company:companies(*)")
    .eq("id", authUser.id)
    .single()

  if (!profile || !profile.company_id) {
    redirect("/auth/login")
  }

  // Check permissions
  if (!["super_admin", "company_admin", "manager", "dispatcher"].includes(profile.role)) {
    redirect("/dashboard")
  }

  // Fetch documents with related data
  const { data: documents } = await supabase
    .from("documents")
    .select(`
      *,
      load:loads(load_number),
      invoice:invoices(invoice_number),
      quote:quotes(quote_number)
    `)
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case "invoice":
        return "bg-blue-100 text-blue-800"
      case "pod":
        return "bg-green-100 text-green-800"
      case "customs":
        return "bg-yellow-100 text-yellow-800"
      case "permit":
        return "bg-purple-100 text-purple-800"
      case "insurance":
        return "bg-red-100 text-red-800"
      case "quote":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Document Management</h1>
          <p className="text-muted-foreground">Manage and organize all shipment documents</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {documents?.filter((d) => d.document_type === "invoice").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PODs</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {documents?.filter((d) => d.document_type === "pod").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Other</CardTitle>
            <FileText className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {documents?.filter((d) => !["invoice", "pod"].includes(d.document_type)).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search documents..." className="pl-10" />
              </div>
            </div>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
                <SelectItem value="pod">Proof of Delivery</SelectItem>
                <SelectItem value="customs">Customs</SelectItem>
                <SelectItem value="permit">Permits</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="quote">Quotes</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Document List */}
      <div className="grid gap-4">
        {documents?.map((doc: Document) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{doc.file_name}</h3>
                    <p className="text-muted-foreground">
                      {doc.load?.load_number && `Load: ${doc.load.load_number} `}
                      {doc.invoice?.invoice_number && `Invoice: ${doc.invoice.invoice_number} `}
                      {doc.quote?.quote_number && `Quote: ${doc.quote.quote_number} `}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={getDocumentTypeColor(doc.document_type)}>
                    {doc.document_type.replace("_", " ").toUpperCase()}
                  </Badge>
                  <div className="text-right">
                    <p className="text-sm font-medium">{doc.file_size && formatFileSize(doc.file_size)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!documents || documents.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents found</h3>
              <p className="text-muted-foreground mb-4">Upload your first document to get started.</p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}