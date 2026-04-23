"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { MailCheck, AlertCircle, Loader2 } from "lucide-react"

import { useVerifyEmail } from "@/lib/hooks/use-auth"

/**
 * Verify email handler — calls verifyEmail API on mount using token from URL.
 * Shows loading, success, or error state.
 */
export function VerifyEmailHandler() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const verifyMutation = useVerifyEmail()

  useEffect(() => {
    if (token) {
      verifyMutation.mutate({ token })
    }
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // No token
  if (!token) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-[#FEF2F2]">
          <AlertCircle className="size-6 text-[#DC2626]" />
        </div>
        <h2 className="mt-4 text-[18px] font-semibold text-foreground">
          Link không hợp lệ
        </h2>
        <p className="mt-1 text-[13px] text-text-secondary">
          Link xác minh email không hợp lệ hoặc đã hết hạn
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-9 w-full items-center justify-center rounded-[8px] bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Đăng nhập
        </Link>
      </div>
    )
  }

  // Loading
  if (verifyMutation.isPending) {
    return (
      <div className="flex flex-col items-center text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <h2 className="mt-4 text-[18px] font-semibold text-foreground">
          Xác minh email
        </h2>
        <p className="mt-1 text-[13px] text-text-secondary">
          Đang xác minh email của bạn...
        </p>
      </div>
    )
  }

  // Error
  if (verifyMutation.isError) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-[#FEF2F2]">
          <AlertCircle className="size-6 text-[#DC2626]" />
        </div>
        <h2 className="mt-4 text-[18px] font-semibold text-foreground">
          Xác minh thất bại
        </h2>
        <p className="mt-1 text-[13px] text-text-secondary">
          Link xác minh đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-9 w-full items-center justify-center rounded-[8px] bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Đăng nhập
        </Link>
      </div>
    )
  }

  // Success
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-[#ECFDF5]">
        <MailCheck className="size-6 text-[#059669]" />
      </div>
      <h2 className="mt-4 text-[18px] font-semibold text-foreground">
        Email đã được xác minh
      </h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Tài khoản của bạn đã được xác minh thành công
      </p>
      <Link
        href="/login"
        className="mt-6 inline-flex h-9 w-full items-center justify-center rounded-[8px] bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover"
      >
        Đăng nhập
      </Link>
    </div>
  )
}
