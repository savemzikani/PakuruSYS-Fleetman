import type React from "react"
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2" },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2",
      fontWeight: "bold",
    },
  ],
})

const styles = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10, paddingTop: 35, paddingBottom: 65, paddingHorizontal: 35, backgroundColor: "#ffffff" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30, paddingBottom: 20, borderBottomWidth: 2, borderBottomColor: "#0891b2" },
  logo: { fontSize: 24, fontWeight: "bold", color: "#0891b2" },
  companyInfo: { textAlign: "right", fontSize: 9, color: "#6b7280" },
  title: { fontSize: 28, fontWeight: "bold", color: "#111827", marginBottom: 10 },
  number: { fontSize: 14, color: "#6b7280", marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  column: { flex: 1, marginRight: 20 },
  label: { fontSize: 9, color: "#6b7280", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.3 },
  value: { fontSize: 11, color: "#111827" },
  table: { marginTop: 20 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", paddingVertical: 8, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: "#d1d5db" },
  tableHeaderCell: { fontSize: 9, fontWeight: "bold", color: "#374151", textTransform: "uppercase", letterSpacing: 0.3 },
  tableRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tableCell: { fontSize: 10, color: "#111827" },
  totalsSection: { marginTop: 30, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", width: 200, marginBottom: 5 },
  totalLabel: { fontSize: 10, color: "#6b7280" },
  totalValue: { fontSize: 10, color: "#111827" },
  footer: { position: "absolute", bottom: 30, left: 35, right: 35, textAlign: "center", color: "#6b7280", fontSize: 8, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 10 },
})

interface QuoteItemData {
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface QuoteData {
  quote_number: string
  quote_date: string
  valid_until: string
  currency: string
  subtotal: number
  tax_amount: number
  total_amount: number
  notes?: string | null
  terms?: string | null
  company: {
    name: string
    address: string
    city: string
    country: string
    phone: string
    email: string
    registration_number?: string | null
    tax_number?: string | null
  }
  customer: {
    name: string
    address?: string | null
    city?: string | null
    country?: string | null
    phone?: string | null
    email?: string | null
  }
  items: QuoteItemData[]
}

export const QuotePDF: React.FC<{ data: QuoteData }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>SADC Logistics</Text>
          <Text style={styles.companyInfo}>{data.company.name}</Text>
          <Text style={styles.companyInfo}>{data.company.address}</Text>
          <Text style={styles.companyInfo}>{data.company.city}, {data.company.country}</Text>
          <Text style={styles.companyInfo}>Tel: {data.company.phone}</Text>
          <Text style={styles.companyInfo}>Email: {data.company.email}</Text>
        </View>
        <View style={styles.companyInfo}>
          {data.company.registration_number ? <Text>Reg: {data.company.registration_number}</Text> : null}
          {data.company.tax_number ? <Text>Tax: {data.company.tax_number}</Text> : null}
        </View>
      </View>

      <Text style={styles.title}>QUOTE</Text>
      <Text style={styles.number}>{data.quote_number}</Text>

      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.sectionTitle}>To</Text>
          <Text style={styles.value}>{data.customer.name}</Text>
          {data.customer.address ? <Text style={styles.value}>{data.customer.address}</Text> : null}
          {(data.customer.city || data.customer.country) ? <Text style={styles.value}>{data.customer.city}{data.customer.city && data.customer.country ? ", " : ""}{data.customer.country}</Text> : null}
          {data.customer.phone ? <Text style={styles.value}>Tel: {data.customer.phone}</Text> : null}
          {data.customer.email ? <Text style={styles.value}>Email: {data.customer.email}</Text> : null}
        </View>
        <View style={styles.column}>
          <View style={styles.section}><Text style={styles.label}>Quote Date</Text><Text style={styles.value}>{new Date(data.quote_date).toLocaleDateString()}</Text></View>
          <View style={styles.section}><Text style={styles.label}>Valid Until</Text><Text style={styles.value}>{new Date(data.valid_until).toLocaleDateString()}</Text></View>
          <View style={styles.section}><Text style={styles.label}>Currency</Text><Text style={styles.value}>{data.currency}</Text></View>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Description</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Qty</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>Unit Price</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>Total</Text>
        </View>
        {data.items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 3 }]}>{item.description}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "center" }]}>{item.quantity}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
              {new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency }).format(item.unit_price)}
            </Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
              {new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency }).format(item.total)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.totalsSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal:</Text>
          <Text style={styles.totalValue}>
            {new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency }).format(data.subtotal)}
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax:</Text>
          <Text style={styles.totalValue}>
            {new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency }).format(data.tax_amount)}
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>
            {new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency }).format(data.total_amount)}
          </Text>
        </View>
      </View>

      {data.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text>{data.notes}</Text>
        </View>
      ) : null}

      {data.terms ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms</Text>
          <Text>{data.terms}</Text>
        </View>
      ) : null}

      <Text style={styles.footer}>This quote is valid until the date shown. Prices are subject to change thereafter.</Text>
    </Page>
  </Document>
)


