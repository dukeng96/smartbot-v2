"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth-schemas"
import { useRegister } from "@/lib/hooks/use-auth"

import { GoogleOAuthButton } from "./google-oauth-button"
import { PasswordStrengthIndicator } from "./password-strength-indicator"

/**
 * Register form with fullName, email, password + strength indicator + Google OAuth.
 */
export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false)
  const registerMutation = useRegister()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const passwordValue = watch("password", "")

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data)
  }

  return (
    <>
      <h2 className="text-[18px] font-semibold text-foreground">Tạo tài khoản</h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Bắt đầu dùng thử miễn phí, không cần thẻ tín dụng
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Họ tên</label>
          <Input
            type="text"
            placeholder="Nguyễn Văn A"
            {...register("fullName")}
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && (
            <p className="text-[12px] text-[#DC2626]">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Email</label>
          <Input
            type="email"
            placeholder="you@company.com"
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-[12px] text-[#DC2626]">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Mật khẩu</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Ít nhất 8 ký tự"
              className="pr-10"
              {...register("password")}
              aria-invalid={!!errors.password}
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
          {errors.password && (
            <p className="text-[12px] text-[#DC2626]">{errors.password.message}</p>
          )}
          <PasswordStrengthIndicator password={passwordValue} />
        </div>

        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
          {registerMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Đăng ký
        </Button>
      </form>

      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-[12px] text-text-muted">
          hoặc
        </span>
      </div>

      <GoogleOAuthButton label="Đăng ký bằng Google" />

      <p className="mt-6 text-center text-[13px] text-text-secondary">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </>
  )
}
