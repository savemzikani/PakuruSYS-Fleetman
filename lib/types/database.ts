// Database types for the SADC Logistics System
export type UserRole = "super_admin" | "company_admin" | "manager" | "dispatcher" | "driver" | "customer"
export type CompanyStatus = "active" | "inactive" | "suspended"
export type VehicleStatus = "active" | "maintenance" | "out_of_service" | "retired"
export type LoadStatus = "pending" | "assigned" | "in_transit" | "delivered" | "cancelled"
export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled"
export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted"
export type DocumentType = "invoice" | "pod" | "customs" | "permit" | "insurance" | "quote" | "other"
export type CurrencyCode =
  | "USD"
  | "ZAR"
  | "BWP"
  | "NAD"
  | "SZL"
  | "LSL"
  | "MWK"
  | "ZMW"
  | "ZWL"
  | "MZN"
  | "ANG"
  | "MGA"
  | "MUR"
  | "SCR"

export interface Company {
  id: string
  name: string
  registration_number?: string
  tax_number?: string
  email: string
  phone?: string
  address?: string
  city?: string
  country?: string
  postal_code?: string
  status: CompanyStatus
  subscription_plan: string
  subscription_expires_at?: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  company_id?: string
  customer_id?: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  role: UserRole
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
  company?: Company
}

export interface Vehicle {
  id: string
  company_id: string
  registration_number: string
  make?: string
  model?: string
  year?: number
  vin?: string
  engine_number?: string
  fuel_type?: string
  capacity_tons?: number
  status: VehicleStatus
  insurance_expiry?: string
  license_expiry?: string
  last_service_date?: string
  next_service_due?: string
  odometer_reading: number
  created_at: string
  updated_at: string
}

export interface Driver {
  id: string
  company_id: string
  user_id?: string
  first_name: string
  last_name: string
  license_number: string
  license_expiry: string
  phone?: string
  email?: string
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  company_id: string
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  postal_code?: string
  tax_number?: string
  credit_limit: number
  payment_terms: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Load {
  id: string
  company_id: string
  customer_id: string
  load_number: string
  description?: string
  weight_kg?: number
  volume_m3?: number
  pickup_address: string
  pickup_city?: string
  pickup_state?: string
  pickup_country?: string
  pickup_date?: string
  delivery_address: string
  delivery_city?: string
  delivery_state?: string
  delivery_country?: string
  delivery_date?: string
  status: LoadStatus
  rate?: number
  currency: CurrencyCode
  assigned_vehicle_id?: string
  assigned_driver_id?: string
  dispatcher_id?: string
  special_instructions?: string
  cargo_type?: string
  weight?: number
  distance?: number
  created_at: string
  updated_at: string
  customer?: Customer
  vehicle?: Vehicle
  driver?: Driver
}

export interface LoadTracking {
  id: string
  load_id: string
  status: LoadStatus
  location?: string
  latitude?: number
  longitude?: number
  notes?: string
  updated_by?: string
  created_at: string
}

export interface Invoice {
  id: string
  company_id: string
  customer_id: string
  load_id?: string
  invoice_number: string
  issue_date: string
  due_date: string
  subtotal: number
  tax_amount: number
  total_amount: number
  currency: CurrencyCode
  status: PaymentStatus
  paid_date?: string
  notes?: string
  created_at: string
  updated_at: string
  customer?: Customer
  load?: Load
}

export interface Quote {
  id: string
  company_id: string
  customer_id: string
  load_id?: string
  quote_number: string
  quote_date: string
  valid_until: string
  subtotal: number
  tax_amount: number
  total_amount: number
  currency: CurrencyCode
  status: QuoteStatus
  converted_to_invoice_id?: string
  notes?: string
  terms?: string
  created_by?: string
  sent_at?: string
  accepted_at?: string
  rejected_at?: string
  created_at: string
  updated_at: string
  customer?: Customer
  load?: Load
  quote_items?: QuoteItem[]
}

export interface QuoteItem {
  id: string
  quote_id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
  created_at: string
}

export interface Document {
  id: string
  company_id: string
  load_id?: string
  invoice_id?: string
  quote_id?: string
  document_type: DocumentType
  file_name: string
  file_path: string
  file_size?: number
  mime_type?: string
  uploaded_by?: string
  created_at: string
  // Related data from joins
  load?: { load_number: string } | null
  invoice?: { invoice_number: string } | null
  quote?: { quote_number: string } | null
}
