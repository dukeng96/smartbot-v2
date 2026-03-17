"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

function GoogleIcon() {
  return (
    <svg className="mr-2 size-4" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

/** Simple password strength: 0=weak, 1=fair, 2=good, 3=strong */
function getPasswordStrength(password: string): { level: number; label: string } {
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

const STRENGTH_COLORS = ["bg-muted", "bg-[#DC2626]", "bg-[#D97706]", "bg-[#059669]", "bg-[#059669]"]

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const strength = useMemo(() => getPasswordStrength(password), [password])

  return (
    <>
      <h2 className="text-[18px] font-semibold text-foreground">Tạo tài khoản</h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Bắt đầu dùng thử miễn phí, không cần thẻ tín dụng
      </p>

      <form className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Họ tên</label>
          <Input type="text" placeholder="Nguyễn Văn A" />
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Email</label>
          <Input type="email" placeholder="you@company.com" />
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Mật khẩu</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Ít nhất 8 ký tự"
              className="pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {/* Password strength indicator */}
          {password && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      i <= strength.level ? STRENGTH_COLORS[strength.level] : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <p className="text-[11px] text-text-muted">{strength.label}</p>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full">
          Đăng ký
        </Button>
      </form>

      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-[12px] text-text-muted">
          hoặc
        </span>
      </div>

      <Button variant="outline" className="w-full">
        <GoogleIcon />
        Đăng ký bằng Google
      </Button>

      <p className="mt-6 text-center text-[13px] text-text-secondary">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </>
  )
}
