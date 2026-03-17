"use client"

import { cn } from "@/lib/utils"
import { getPasswordStrength, STRENGTH_COLORS } from "@/lib/utils/password-strength"

interface PasswordStrengthIndicatorProps {
  password: string
}

/**
 * Visual password strength bars — 4 colored segments + label.
 * Shown below password field in register and reset password forms.
 */
export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null

  const strength = getPasswordStrength(password)

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= strength.level ? STRENGTH_COLORS[strength.level] : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-text-muted">{strength.label}</p>
    </div>
  )
}
