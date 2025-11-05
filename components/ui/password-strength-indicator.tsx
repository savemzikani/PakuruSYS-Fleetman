export interface PasswordStrengthIndicatorProps {
  strength: number
}

export function PasswordStrengthIndicator({ strength }: PasswordStrengthIndicatorProps) {
  const getStrengthLabel = () => {
    switch (strength) {
      case 0:
        return "Too weak"
      case 1:
        return "Weak"
      case 2:
        return "Fair"
      case 3:
        return "Good"
      case 4:
        return "Strong"
      default:
        return ""
    }
  }

  const getStrengthColor = () => {
    switch (strength) {
      case 0:
      case 1:
        return "bg-destructive"
      case 2:
        return "bg-yellow-500"
      case 3:
        return "bg-blue-500"
      case 4:
        return "bg-green-500"
      default:
        return "bg-muted"
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < strength ? getStrengthColor() : "bg-muted"}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Password strength: <span className="font-medium">{getStrengthLabel()}</span>
      </p>
    </div>
  )
}
