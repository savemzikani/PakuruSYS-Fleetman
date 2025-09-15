import type React from "react"
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"

// Register fonts
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
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    paddingTop: 35,
    paddingBottom: 65,
    paddingHorizontal: 35,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#0891b2",
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0891b2",
  },
  companyInfo: {
    textAlign: "right",
    fontSize: 9,
    color: "#6b7280",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  column: {
    flex: 1,
    marginRight: 20,
  },
  metricCard: {
    backgroundColor: "#f9fafb",
    padding: 15,
    borderRadius: 4,
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  metricChange: {
    fontSize: 8,
    color: "#059669",
    marginTop: 2,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableCell: {
    fontSize: 10,
    color: "#111827",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 35,
    right: 35,
    textAlign: "center",
    color: "#6b7280",
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
})

interface ReportData {
  title: string
  period: string
  generatedAt: string
  company: {
    name: string
    address: string
    city: string
    country: string
  }
  metrics: Array<{
    label: string
    value: string
    change?: string
  }>
  tables: Array<{
    title: string
    headers: string[]
    rows: string[][]
  }>
}

export const ReportPDF: React.FC<{ data: ReportData }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>SADC Logistics</Text>
          <Text style={styles.companyInfo}>{data.company.name}</Text>
          <Text style={styles.companyInfo}>{data.company.address}</Text>
          <Text style={styles.companyInfo}>
            {data.company.city}, {data.company.country}
          </Text>
        </View>
        <View style={styles.companyInfo}>
          <Text>Generated: {new Date(data.generatedAt).toLocaleDateString()}</Text>
          <Text>Period: {data.period}</Text>
        </View>
      </View>

      {/* Report Title */}
      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.subtitle}>Report Period: {data.period}</Text>

      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.row}>
          {data.metrics.slice(0, 2).map((metric, index) => (
            <View key={index} style={styles.column}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={styles.metricValue}>{metric.value}</Text>
                {metric.change && <Text style={styles.metricChange}>{metric.change}</Text>}
              </View>
            </View>
          ))}
        </View>
        <View style={styles.row}>
          {data.metrics.slice(2, 4).map((metric, index) => (
            <View key={index} style={styles.column}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={styles.metricValue}>{metric.value}</Text>
                {metric.change && <Text style={styles.metricChange}>{metric.change}</Text>}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Data Tables */}
      {data.tables.map((table, tableIndex) => (
        <View key={tableIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{table.title}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              {table.headers.map((header, headerIndex) => (
                <Text key={headerIndex} style={[styles.tableHeaderCell, { flex: 1 }]}>
                  {header}
                </Text>
              ))}
            </View>
            {table.rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.tableRow}>
                {row.map((cell, cellIndex) => (
                  <Text key={cellIndex} style={[styles.tableCell, { flex: 1 }]}>
                    {cell}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Footer */}
      <Text style={styles.footer}>
        This report was generated automatically by SADC Logistics Management System
        {"\n"}For questions about this report, please contact your system administrator
      </Text>
    </Page>
  </Document>
)
