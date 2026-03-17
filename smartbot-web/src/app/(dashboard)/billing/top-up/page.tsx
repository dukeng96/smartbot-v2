"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { CreditUsageBar } from "@/components/shared/credit-usage-bar"
import { TopUpForm } from "@/components/features/billing/top-up-form"
import { formatDate } from "@/lib/utils/format-date"
import { formatNumber } from "@/lib/utils/format-number"
import { useCreditUsage, useTopUp } from "@/lib/hooks/use-billing"

/**
 * G3 — Credit top-up page.
 * Current balance card + package selector + payment method + submit.
 */
export default function TopUpPage() {
  const {
    data: credits,
    isLoading,
    isError,
    refetch,
  } = useCreditUsage()

  const topUp = useTopUp()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb />
        <LoadingSkeleton variant="cards" rows={3} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <Breadcrumb />
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  }

  const totalAllocated = (credits?.creditsAllocated ?? 0) + (credits?.topUpCredits ?? 0)

  return (
    <div className="space-y-6">
      <Breadcrumb />

      {/* Current balance card */}
      {credits && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-[13px] font-semibold text-foreground">
            Số dư hiện tại
          </h3>
          <p className="mt-2 text-[28px] font-bold text-foreground tabular-nums">
            {formatNumber(totalAllocated - credits.creditsUsed)}
            <span className="ml-1 text-[14px] font-normal text-text-muted">
              credits còn lại
            </span>
          </p>
          <div className="mt-3 max-w-md">
            <CreditUsageBar used={credits.creditsUsed} allocated={totalAllocated} />
          </div>
          <p className="mt-2 text-[12px] text-text-muted">
            Reset vào {formatDate(credits.periodEnd)}
          </p>
        </div>
      )}

      {/* Top-up form */}
      <TopUpForm
        onSubmit={(data) => topUp.mutate(data)}
        submitting={topUp.isPending}
      />
    </div>
  )
}

function Breadcrumb() {
  return (
    <Link
      href="/billing/subscription"
      className="inline-flex items-center gap-1.5 rounded-[8px] px-3 h-8 text-xs font-semibold text-text-secondary hover:bg-primary-light transition-all"
    >
      <ArrowLeft className="size-4" />
      Billing / Mua thêm Credits
    </Link>
  )
}
