import { PageHeader } from "@/components/layout/page-header"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

/**
 * G3 — Buy extra credits.
 * Shows credit package options + payment form.
 * Data: POST /api/v1/billing/top-up
 */
export default function TopUpPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mua thêm Credits"
        description="Chọn gói credits phù hợp"
      />

      {/* TODO: Credit package cards + payment flow */}
      <LoadingSkeleton variant="cards" />
    </div>
  )
}
