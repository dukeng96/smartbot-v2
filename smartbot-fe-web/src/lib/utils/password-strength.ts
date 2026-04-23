/**
 * Password strength calculator — returns level (0-4) and Vietnamese label.
 * Used in register form and reset password form.
 */
export function getPasswordStrength(password: string): { level: number; label: string } {
  if (!password) return { level: 0, label: "" }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { level: 1, label: "Yếu" }
  if (score === 2) return { level: 2, label: "Trung bình" }
  if (score === 3) return { level: 3, label: "Tốt" }
  return { level: 4, label: "Mạnh" }
}

export const STRENGTH_COLORS = [
  "bg-muted",
  "bg-[#DC2626]",
  "bg-[#D97706]",
  "bg-[#059669]",
  "bg-[#059669]",
]
