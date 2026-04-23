"use client"

import { Suspense } from "react"

import { VerifyEmailHandler } from "@/components/features/auth/verify-email-handler"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

/**
 * A5 — Email verification page. Wraps in Suspense because
 * VerifyEmailHandler uses useSearchParams() which requires it.
 */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="form" rows={1} />}>
      <VerifyEmailHandler />
    </Suspense>
  )
}
