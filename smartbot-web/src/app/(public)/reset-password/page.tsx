"use client"

import { Suspense } from "react"

import { ResetPasswordForm } from "@/components/features/auth/reset-password-form"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

/**
 * A4 — Reset password page. Wraps in Suspense because
 * ResetPasswordForm uses useSearchParams() which requires it.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="form" rows={2} />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
