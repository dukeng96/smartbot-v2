"use client"

import { useState } from "react"
import { BarChart3 } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { PeriodFilter, type PeriodValue } from "@/components/shared/period-filter"

/**
 * F2 — Bot-specific analytics.
 * Data: GET /api/v1/analytics/bots/:botId
 */
export default function BotAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodValue>("30d")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phân tích Bot"
        actions={<PeriodFilter value={period} onChange={setPeriod} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Hội thoại" value={0} icon={BarChart3} />
        <KpiCard label="Tin nhắn" value={0} icon={BarChart3} />
        <KpiCard label="Credits" value={0} icon={BarChart3} />
        <KpiCard label="Đánh giá TB" value="--" icon={BarChart3} />
      </div>

      {/* TODO: Recharts charts for this specific bot */}
    </div>
  )
}
