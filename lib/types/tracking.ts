export interface TrackingPoint {
  id: string
  status: string
  latitude: number | null
  longitude: number | null
  location?: string | null
  notes?: string | null
  createdAt: string
}

export interface LoadSummary {
  id: string
  loadNumber: string
  status: string
}
