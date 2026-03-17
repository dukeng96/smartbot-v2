import { PageHeader } from "@/components/layout/page-header"
import { CreditUsageBar } from "@/components/shared/credit-usage-bar"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

/**
 * G2 — Current subscription + credit usage.
 * Data: GET /api/v1/billing/subscription
 */
export default function SubscriptionPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Gói hiện tại" description="Quản lý subscription và credit" />

      {/* Credit usage */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-[var(--font-size-card-title)] font-semibold text-foreground">
          Sử dụng Credits
        </h3>
        <div className="mt-4 max-w-md">
          <CreditUsageBar used={0} allocated={100} topUp />
        </div>
      </div>

      {/* TODO: Current plan details + upgrade/downgrade buttons */}
      <LoadingSkeleton variant="detail" />
    </div>
  )
}
