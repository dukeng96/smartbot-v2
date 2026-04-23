"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, CheckCircle2, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { profileSchema, type ProfileFormData } from "@/lib/validations/settings-schemas"
import { useUpdateProfile } from "@/lib/hooks/use-user"
import type { User } from "@/lib/types/user"
import { formatDate } from "@/lib/utils/format-date"

import { ChangePasswordSection } from "./change-password-section"

interface ProfileFormProps {
  user: User
}

/**
 * Profile form — avatar display, editable fullName + phone,
 * read-only email with verified badge, auth provider badge, last login.
 * Change password section shown only for email auth users.
 */
export function ProfileForm({ user }: ProfileFormProps) {
  const updateProfile = useUpdateProfile()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName ?? "",
      phone: user.phone ?? "",
    },
  })

  // Sync form when user data changes (e.g., after refetch)
  useEffect(() => {
    reset({
      fullName: user.fullName ?? "",
      phone: user.phone ?? "",
    })
  }, [user, reset])

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate({
      fullName: data.fullName,
      phone: data.phone || null,
    })
  }

  const initials = (user.fullName ?? user.email)
    .charAt(0)
    .toUpperCase()

  return (
    <div className="space-y-6">
      {/* Avatar + basic info header */}
      <div className="flex items-center gap-4">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName ?? "Avatar"}
            className="size-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-full bg-primary-light">
            <span className="text-2xl font-semibold text-primary">{initials}</span>
          </div>
        )}
        <div>
          <p className="text-[16px] font-semibold text-foreground">{user.fullName ?? "—"}</p>
          <p className="text-[13px] text-text-secondary">{user.email}</p>
        </div>
      </div>

      {/* Profile edit form */}
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-[#374151]">Họ tên</label>
          <Input
            {...register("fullName")}
            placeholder="Nhập họ tên"
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && (
            <p className="text-[12px] text-[#DC2626]">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-[#374151]">Email</label>
          <div className="flex items-center gap-2">
            <Input value={user.email} disabled className="flex-1 bg-muted" />
            {user.emailVerified && (
              <span className="inline-flex items-center gap-1 text-[12px] text-[#059669]">
                <CheckCircle2 className="size-3.5" />
                Đã xác minh
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-[#374151]">Số điện thoại</label>
          <Input
            {...register("phone")}
            placeholder="Nhập số điện thoại"
            aria-invalid={!!errors.phone}
          />
          {errors.phone && (
            <p className="text-[12px] text-[#DC2626]">{errors.phone.message}</p>
          )}
        </div>

        {/* Read-only info */}
        <div className="flex items-center gap-6 text-[13px] text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <Shield className="size-3.5" />
            {user.authProvider === "google" ? "Google" : "Email"} auth
          </span>
          {user.lastLoginAt && (
            <span>Đăng nhập lần cuối: {formatDate(user.lastLoginAt)}</span>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || updateProfile.isPending}>
            {updateProfile.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Lưu thay đổi
          </Button>
        </div>
      </form>

      {/* Change password — only for email auth */}
      {user.authProvider === "email" && <ChangePasswordSection />}
    </div>
  )
}
