"use client"

import Link from "next/link"

import { PageHeader } from "@/components/layout/page-header"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { CreditUsageBar } from "@/components/shared/credit-usage-bar"
import { SubscriptionDetailCard } from "@/components/features/billing/subscription-detail-card"
import { PaymentHistoryTable } from "@/components/features/billing/payment-history-table"
import { formatDate } from "@/lib/utils/format-date"
import {
  useSubscription,
  useCreditUsage,
  usePayments,
  useCancelSubscription,
} from "@/lib/hooks/use-billing"

/**
 * G2 — Subscription management page.
 * Card 1: Current subscription. Card 2: Credit usage. Card 3: Recent payments.
 */
export default function SubscriptionPage() {
  const {
    data: subscription,
    isLoading: subLoading,
    isError: subError,
    refetch: refetchSub,
  } = useSubscription()

  const { data: credits, isLoading: credLoading } = useCreditUsage()
  const { data: paymentsData } = usePayments({ limit: 3 })
  const cancelSub = useCancelSubscription()

  const isLoading = subLoading || credLoading
  const isError = subError

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Gói hiện tại" description="Quản lý subscription và credit" />
        <LoadingSkeleton variant="detail" rows={6} />
      </div>
    )
  }

  if (isError || !subscription) {
    return (
      <div className="space-y-6">
        <PageHeader title="Gói hiện tại" description="Quản lý subscription và credit" />
        <ErrorState onRetry={() => refetchSub()} />
      </div>
    )
  }

  const recentPayments = paymentsData?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Gói hiện tại" description="Quản lý subscription và credit" />

      {/* Card 1: Current Subscription */}
      <SubscriptionDetailCard
        subscription={subscription}
        onCancel={() => cancelSub.mutate()}
        cancelling={cancelSub.isPending}
      />

      {/* Card 2: Credit Usage */}
      {credits && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-[13px] font-semibold text-foreground">
            Sử dụng Credits
          </h3>
          <div className="mt-4 max-w-md">
            <CreditUsageBar
              used={credits.creditsUsed}
              allocated={credits.creditsAllocated + credits.topUpCredits}
              topUp
            />
          </div>
          <p className="mt-2 text-[12px] text-text-muted">
            Reset vào {formatDate(credits.periodEnd)}
          </p>
        </div>
      )}

      {/* Card 3: Recent Payments */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-semibold text-foreground">
            Lịch sử gần đây
          </h3>
          <Link
            href="/billing/payments"
            className="text-[12px] font-medium text-primary hover:underline"
          >
            Xem tất cả
          </Link>
        </div>
        {recentPayments.length > 0 ? (
          <PaymentHistoryTable data={recentPayments} />
        ) : (
          <p className="text-[13px] text-text-muted">Chưa có giao dịch</p>
        )}
      </div>
    </div>
  )
}
