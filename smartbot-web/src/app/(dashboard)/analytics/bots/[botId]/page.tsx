"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowLeft, MessageSquare, Star, Zap } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ErrorState } from "@/components/shared/error-state"
import { KpiCard } from "@/components/shared/kpi-card"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { PeriodFilter, type PeriodValue } from "@/components/shared/period-filter"
import { useBot } from "@/lib/hooks/use-bots"
import {
  useConversationAnalytics,
  useMessageAnalytics,
  useTopQuestions,
  useSatisfaction,
} from "@/lib/hooks/use-analytics"
import { formatNumber } from "@/lib/utils/format-number"

const ConversationsChart = dynamic(
  () => import("@/components/features/analytics/conversations-chart").then((m) => ({ default: m.ConversationsChart })),
  { ssr: false }
)
const MessagesChart = dynamic(
  () => import("@/components/features/analytics/messages-chart").then((m) => ({ default: m.MessagesChart })),
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
 * F2 — Bot-specific analytics page.
 * Breadcrumb: "← Phân tích / [Bot name]"
 * Period selector + 4 KPI cards + conversations chart + messages chart
 * + top questions + satisfaction
 */
export default function BotAnalyticsPage() {
  const params = useParams<{ botId: string }>()
  const botId = params.botId
  const [period, setPeriod] = useState<PeriodValue>("30d")

  const botQuery = useBot(botId)
  const conversations = useConversationAnalytics({ period, botId })
  const messages = useMessageAnalytics({ period, botId })
  const topQuestions = useTopQuestions(botId)
  const satisfaction = useSatisfaction(botId)

  /* Loading state */
  if (botQuery.isLoading || conversations.isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="detail" rows={3} />
        <LoadingSkeleton variant="cards" rows={4} />
      </div>
    )
  }

  /* Error state */
  if (botQuery.isError) {
    return (
      <div className="space-y-6">
        <ErrorState onRetry={() => botQuery.refetch()} />
      </div>
    )
  }

  const botName = botQuery.data?.name ?? "Assistant"

  /* Compute summary from conversation data */
  const convData = conversations.data ?? []
  const msgData = messages.data ?? []
  const totalConversations = convData.reduce((sum, d) => sum + d.count, 0)
  const totalMessages = msgData.reduce((sum, d) => sum + d.count, 0)
  const avgRating = satisfaction.data?.avgRating ?? 0

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px]">
        <Link href="/analytics" className="flex items-center gap-1 text-primary hover:underline">
          <ArrowLeft className="size-3.5" />
          Phân tích
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-foreground">{botName}</span>
      </div>

      {/* Header with period selector */}
      <PageHeader
        title={botName}
        actions={<PeriodFilter value={period} onChange={setPeriod} />}
      />

      {/* 4 KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Hội thoại"
          value={formatNumber(totalConversations)}
          icon={MessageSquare}
        />
        <KpiCard
          label="Tin nhắn"
          value={formatNumber(totalMessages)}
          icon={MessageSquare}
        />
        <KpiCard
          label="Credits"
          value="—"
          icon={Zap}
        />
        <KpiCard
          label="Đánh giá TB"
          value={avgRating > 0 ? avgRating.toFixed(1) : "—"}
          icon={Star}
        />
      </div>

      {/* Charts: conversations + messages */}
      <div className="grid gap-4 lg:grid-cols-2">
        {convData.length > 0 ? (
          <ConversationsChart data={convData} />
        ) : (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[14px] font-semibold">Hội thoại theo thời gian</p>
            <p className="mt-4 text-[13px] text-text-secondary">Chưa có dữ liệu</p>
          </div>
        )}

        {msgData.length > 0 ? (
          <MessagesChart data={msgData} />
        ) : (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[14px] font-semibold">Tin nhắn theo thời gian</p>
            <p className="mt-4 text-[13px] text-text-secondary">Chưa có dữ liệu</p>
          </div>
        )}
      </div>

      {/* Bottom: top questions + satisfaction */}
      <div className="grid gap-4 lg:grid-cols-2">
        {topQuestions.isLoading ? (
          <LoadingSkeleton variant="table" rows={5} />
        ) : topQuestions.data ? (
          <TopQuestionsTable data={topQuestions.data} />
        ) : null}

        {satisfaction.isLoading ? (
          <LoadingSkeleton variant="detail" rows={5} />
        ) : satisfaction.data ? (
          <SatisfactionChart data={satisfaction.data} />
        ) : null}
      </div>
    </div>
  )
}
