import { PageHeader } from "@/components/layout/page-header"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

/**
 * G1 — Plans pricing table.
 * Shows Free, Pro, Enterprise plan cards.
 * Data: GET /api/v1/plans
 */
export default function BillingPlansPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gói dịch vụ"
        description="Chọn gói phù hợp với nhu cầu của bạn"
      />

      {/* TODO: Plan pricing cards (Free / Pro / Enterprise) */}
      <LoadingSkeleton variant="cards" />
    </div>
  )
}
