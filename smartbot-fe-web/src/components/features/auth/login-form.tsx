"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { loginSchema, type LoginFormData } from "@/lib/validations/auth-schemas"
import { useLogin } from "@/lib/hooks/use-auth"

import { GoogleOAuthButton } from "./google-oauth-button"

/**
 * Login form with email/password + Google OAuth.
 * Integrates React Hook Form + Zod + useLogin mutation.
 */
export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const loginMutation = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data)
  }

  return (
    <>
      <h2 className="text-[18px] font-semibold text-foreground">Đăng nhập</h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Nhập email và mật khẩu để tiếp tục
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
              placeholder="••••••••"
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
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-[12px] font-medium text-primary hover:underline"
          >
            Quên mật khẩu?
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Đăng nhập
        </Button>
      </form>

      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-[12px] text-text-muted">
          hoặc
        </span>
      </div>

      <GoogleOAuthButton />

      <p className="mt-6 text-center text-[13px] text-text-secondary">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Đăng ký
        </Link>
      </p>
    </>
  )
}
