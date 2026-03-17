"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown, ChevronRight, Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { changePasswordSchema, type ChangePasswordFormData } from "@/lib/validations/auth-schemas"
import { useChangePassword } from "@/lib/hooks/use-user"

/**
 * Collapsible change password section — only for email auth users.
 * Uses separate form from profile form to avoid mixed concerns.
 */
export function ChangePasswordSection() {
  const [isOpen, setIsOpen] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const changePassword = useChangePassword()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  const onSubmit = (data: ChangePasswordFormData) => {
    changePassword.mutate(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      { onSuccess: () => reset() },
    )
  }

  return (
    <>
      <Separator />
      <button
        type="button"
        className="flex w-full items-center gap-2 text-[14px] font-semibold text-foreground"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        Đổi mật khẩu
      </button>

      {isOpen && (
        <form className="space-y-4 pl-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#374151]">Mật khẩu hiện tại</label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                className="pr-10"
                {...register("currentPassword")}
                aria-invalid={!!errors.currentPassword}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-[12px] text-[#DC2626]">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#374151]">Mật khẩu mới</label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                placeholder="Ít nhất 8 ký tự"
                className="pr-10"
                {...register("newPassword")}
                aria-invalid={!!errors.newPassword}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-[12px] text-[#DC2626]">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#374151]">Xác nhận mật khẩu mới</label>
            <Input
              type="password"
              {...register("confirmNewPassword")}
              aria-invalid={!!errors.confirmNewPassword}
            />
            {errors.confirmNewPassword && (
              <p className="text-[12px] text-[#DC2626]">{errors.confirmNewPassword.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Đổi mật khẩu
            </Button>
          </div>
        </form>
      )}
    </>
  )
}
