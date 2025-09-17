export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold">Account Pending Approval</h1>
        <p className="text-muted-foreground">
          Your account has been created, but a super admin must approve it before you can access the app.
        </p>
        <p className="text-sm text-muted-foreground">
          If you believe this is a mistake, please contact your administrator.
        </p>
      </div>
    </div>
  )
}


