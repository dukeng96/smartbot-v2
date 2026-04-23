"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/validations/auth-schemas"
import { useResetPassword } from "@/lib/hooks/use-auth"

import { PasswordStrengthIndicator } from "./password-strength-indicator"

/**
 * Reset password form — reads token from URL, sets new password.
 * Redirects to /login on success via useResetPassword hook.
 */
export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const resetMutation = useResetPassword()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const passwordValue = watch("password", "")

  const onSubmit = (data: ResetPasswordFormData) => {
    resetMutation.mutate({ token, password: data.password })
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center text-center">
        <h2 className="text-[18px] font-semibold text-foreground">Link không hợp lệ</h2>
        <p className="mt-1 text-[13px] text-text-secondary">
          Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex h-9 w-full items-center justify-center rounded-[8px] bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Gửi lại link
        </Link>
      </div>
    )
  }

  return (
    <>
      <h2 className="text-[18px] font-semibold text-foreground">Đặt lại mật khẩu</h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Nhập mật khẩu mới cho tài khoản của bạn
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Mật khẩu mới</label>
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

        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Xác nhận mật khẩu</label>
          <div className="relative">
            <Input
              type={showConfirm ? "text" : "password"}
              placeholder="Nhập lại mật khẩu"
              className="pr-10"
              {...register("confirmPassword")}
              aria-invalid={!!errors.confirmPassword}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-[12px] text-[#DC2626]">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={resetMutation.isPending}>
          {resetMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Đặt lại mật khẩu
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-text-secondary">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </>
  )
}
