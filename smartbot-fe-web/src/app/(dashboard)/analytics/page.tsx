"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { BarChart3 } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { AnalyticsBotSelector } from "@/components/features/analytics/analytics-bot-selector"
import { AnalyticsKpiGrid } from "@/components/features/analytics/analytics-kpi-grid"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { PeriodFilter, type PeriodValue } from "@/components/shared/period-filter"
import {
  useAnalyticsOverview,
  useConversationAnalytics,
  useChannelAnalytics,
  useTopQuestions,
  useSatisfaction,
} from "@/lib/hooks/use-analytics"

/* Lazy-load chart components to reduce initial bundle */
const ConversationsChart = dynamic(
  () => import("@/components/features/analytics/conversations-chart").then((m) => ({ default: m.ConversationsChart })),
  { ssr: false }
)
const ChannelsPieChart = dynamic(
  () => import("@/components/features/analytics/channels-pie-chart").then((m) => ({ default: m.ChannelsPieChart })),
  { ssr: false }
)
const TopQuestionsTable = dynamic(
  () => import("@/components/features/analytics/top-questions-table").then((m) => ({ default: m.TopQuestionsTable })),
  { ssr: false }
)
const SatisfactionChart = dynamic(
  () => import("@/components/features/analytics/satisfaction-chart").then((m) => ({ default: m.SatisfactionChart })),
  { ssr: false }
)

/**
 * F1 — Analytics overview. KPIs + bot filter + charts.
 */
export default function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodValue>("30d")
  const [botId, setBotId] = useState<string | undefined>(undefined)

  const overview = useAnalyticsOverview()
  const conversations = useConversationAnalytics({ period, botId })
  const channels = useChannelAnalytics(period)
  const topQuestions = useTopQuestions(botId)
  const satisfaction = useSatisfaction(botId)

  /* Loading state */
  if (overview.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Phân tích" description="Theo dõi hiệu suất của các assistant" />
        <LoadingSkeleton variant="cards" rows={5} />
      </div>
    )
  }

  /* Error state */
  if (overview.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Phân tích" description="Theo dõi hiệu suất của các assistant" />
        <ErrorState onRetry={() => overview.refetch()} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with period filter + bot selector */}
      <PageHeader
        title="Phân tích"
        description="Theo dõi hiệu suất của các assistant"
        actions={
          <div className="flex items-center gap-3">
            <AnalyticsBotSelector value={botId} onChange={setBotId} />
            <PeriodFilter value={period} onChange={setPeriod} />
          </div>
        }
      />

      {/* KPI Cards */}
      {overview.data ? (
        <AnalyticsKpiGrid data={overview.data} />
      ) : (
        <EmptyState
          icon={BarChart3}
          title="Chưa có dữ liệu phân tích"
          description="Dữ liệu sẽ hiển thị khi assistant bắt đầu nhận hội thoại"
        />
      )}

      {/* Charts row: conversations (60%) + channels donut (40%) */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {conversations.data && conversations.data.length > 0 ? (
          <ConversationsChart data={conversations.data} />
        ) : (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[14px] font-semibold">Hội thoại theo thời gian</p>
            <p className="mt-4 text-[13px] text-text-secondary">Chưa có dữ liệu</p>
          </div>
        )}

        {channels.data && channels.data.length > 0 ? (
          <ChannelsPieChart data={channels.data} />
        ) : (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[14px] font-semibold">Theo kênh</p>
            <p className="mt-4 text-[13px] text-text-secondary">Chưa có dữ liệu</p>
          </div>
        )}
      </div>

      {/* Bottom row: top questions + satisfaction (only when bot selected) */}
      {botId && (
        <div className="grid gap-4 lg:grid-cols-2">
          {topQuestions.data ? (
            <TopQuestionsTable data={topQuestions.data} />
          ) : topQuestions.isLoading ? (
            <LoadingSkeleton variant="table" rows={5} />
          ) : null}

          {satisfaction.data ? (
            <SatisfactionChart data={satisfaction.data} />
          ) : satisfaction.isLoading ? (
            <LoadingSkeleton variant="detail" rows={5} />
          ) : null}
        </div>
      )}
    </div>
  )
}
