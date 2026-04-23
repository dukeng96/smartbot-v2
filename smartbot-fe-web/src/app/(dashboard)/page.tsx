"use client"

import Link from "next/link"
import { Bot, FileText, MessageSquare, Zap } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { KpiCard } from "@/components/shared/kpi-card"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { useAnalyticsOverview } from "@/lib/hooks/use-analytics"
import { useBots } from "@/lib/hooks/use-bots"
import { formatNumber } from "@/lib/utils/format-number"

/**
 * B2 — Dashboard home. Shows overview KPIs + quick actions + bot cards.
 * Data: GET /api/v1/analytics/overview + GET /api/v1/bots
 */
export default function DashboardPage() {
  const overview = useAnalyticsOverview()
  const botsQuery = useBots({ limit: 3, sortBy: "createdAt", sortOrder: "desc" })

  if (overview.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Tổng quan hoạt động hôm nay" />
        <LoadingSkeleton variant="cards" rows={5} />
      </div>
    )
  }

  if (overview.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Tổng quan hoạt động hôm nay" />
        <ErrorState onRetry={() => overview.refetch()} />
      </div>
    )
  }

  const data = overview.data
  const bots = botsQuery.data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Tổng quan hoạt động hôm nay" />

      {/* KPI Cards */}
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Cuộc hội thoại"
            value={formatNumber(data.totalConversationsToday)}
            icon={MessageSquare}
          />
          <KpiCard
            label="Tin nhắn"
            value={formatNumber(data.totalMessagesToday)}
            icon={MessageSquare}
          />
          <KpiCard
            label="Credits còn lại"
            value={formatNumber(data.creditsRemaining)}
            icon={Zap}
            progress={{
              value: data.creditsUsed,
              max: data.creditsUsed + data.creditsRemaining,
            }}
          />
          <KpiCard
            label="Assistant hoạt động"
            value={formatNumber(data.activeBots)}
            icon={Bot}
          />
          <KpiCard
            label="Tài liệu"
            value={formatNumber(data.totalDocuments)}
            icon={FileText}
          />
        </div>
      ) : (
        <EmptyState
          icon={MessageSquare}
          title="Chưa có dữ liệu"
          description="Tạo assistant đầu tiên để bắt đầu"
        />
      )}

      {/* My Assistants section */}
      {bots.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-foreground">
              Assistants của tôi
            </h2>
            <Link
              href="/bots"
              className="text-[13px] font-medium text-primary hover:underline"
            >
              Xem tất cả
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot) => (
              <DashboardBotCard key={bot.id} bot={bot} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/** Compact bot card for dashboard — name + status */
function DashboardBotCard({ bot }: { bot: { id: string; name: string; status: string } }) {
  const statusColorMap: Record<string, string> = {
    active: "bg-[#ECFDF5] text-[#059669]",
    draft: "bg-[#F3F4F6] text-[#6B7280]",
    paused: "bg-[#FFFBEB] text-[#D97706]",
  }
  const statusLabelMap: Record<string, string> = {
    active: "Active",
    draft: "Draft",
    paused: "Paused",
  }

  return (
    <Link
      href={`/bots/${bot.id}/config`}
      className="rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:bg-muted/30"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary-light text-[14px] font-semibold text-primary">
          {bot.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-foreground">{bot.name}</p>
          <span
            className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium ${statusColorMap[bot.status] ?? statusColorMap.draft}`}
          >
            {statusLabelMap[bot.status] ?? bot.status}
          </span>
        </div>
      </div>
    </Link>
  )
}
