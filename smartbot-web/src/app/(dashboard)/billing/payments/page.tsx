import { Receipt } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"

/**
 * G4 — Payment history.
 * Data: GET /api/v1/billing/payments
 */
export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch sử thanh toán"
        description="Xem lại các giao dịch đã thực hiện"
      />

      {/* TODO: DataTable with payment rows + StatusBadge */}

      <EmptyState
        icon={Receipt}
        title="Chưa có giao dịch"
        description="Lịch sử thanh toán sẽ hiển thị ở đây"
      />
    </div>
  )
}
