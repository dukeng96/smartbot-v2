import { Bot, FileText, MessageSquare, Zap } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"

/**
 * B2 — Dashboard home. Shows KPI cards + quick actions.
 * Data: GET /api/v1/analytics/overview
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Tổng quan hoạt động hôm nay"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Cuộc hội thoại"
          value={0}
          icon={MessageSquare}
        />
        <KpiCard
          label="Tin nhắn"
          value={0}
          icon={MessageSquare}
        />
        <KpiCard
          label="Credits còn lại"
          value={0}
          icon={Zap}
          progress={{ value: 0, max: 100 }}
        />
        <KpiCard
          label="Bot đang hoạt động"
          value={0}
          icon={Bot}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          label="Tài liệu đã upload"
          value={0}
          icon={FileText}
        />
      </div>
    </div>
  )
}
