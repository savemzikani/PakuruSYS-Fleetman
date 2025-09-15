export default function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading loads...</p>
      </div>
    </div>
  )
}
