"use client"

import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, MailCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validations/auth-schemas"
import { useForgotPassword } from "@/lib/hooks/use-auth"

/**
 * Forgot password form — email input, sends reset link.
 * Shows success state after submission.
 */
export function ForgotPasswordForm() {
  const forgotMutation = useForgotPassword()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotMutation.mutate(data)
  }

  // Success state — email sent
  if (forgotMutation.isSuccess) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-[#ECFDF5]">
          <MailCheck className="size-6 text-[#059669]" />
        </div>
        <h2 className="mt-4 text-[18px] font-semibold text-foreground">
          Email đã được gửi
        </h2>
        <p className="mt-1 text-[13px] text-text-secondary">
          Vui lòng kiểm tra hộp thư để đặt lại mật khẩu
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-9 w-full items-center justify-center rounded-[8px] bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Quay lại đăng nhập
        </Link>
      </div>
    )
  }

  return (
    <>
      <h2 className="text-[18px] font-semibold text-foreground">Quên mật khẩu</h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Nhập email để nhận link đặt lại mật khẩu
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

        <Button type="submit" className="w-full" disabled={forgotMutation.isPending}>
          {forgotMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Gửi link đặt lại
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-text-secondary">
        Nhớ mật khẩu rồi?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </>
  )
}
