"use client"

import { Bot, FileText, MessageSquare, Zap } from "lucide-react"

import { KpiCard } from "@/components/shared/kpi-card"
import type { AnalyticsOverview } from "@/lib/types/analytics"
import { formatNumber } from "@/lib/utils/format-number"

interface AnalyticsKpiGridProps {
  data: AnalyticsOverview
}

/**
 * 5 KPI cards for Analytics overview (F1).
 * Reuses shared KpiCard component.
 */
export function AnalyticsKpiGrid({ data }: AnalyticsKpiGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <KpiCard
        label="Tổng hội thoại"
        value={formatNumber(data.totalConversationsToday)}
        icon={MessageSquare}
      />
      <KpiCard
        label="Tổng tin nhắn"
        value={formatNumber(data.totalMessagesToday)}
        icon={MessageSquare}
      />
      <KpiCard
        label="Credits sử dụng"
        value={formatNumber(data.creditsUsed)}
        icon={Zap}
        progress={{ value: data.creditsUsed, max: data.creditsUsed + data.creditsRemaining }}
      />
      <KpiCard
        label="Active Assistants"
        value={formatNumber(data.activeBots)}
        icon={Bot}
      />
      <KpiCard
        label="Tài liệu"
        value={formatNumber(data.totalDocuments)}
        icon={FileText}
      />
    </div>
  )
}
