"use client"

import Link from "next/link"

import type { Subscription } from "@/lib/types/subscription"
import { BILLING_CYCLE_LABELS } from "@/lib/types/subscription"
import { formatDate } from "@/lib/utils/format-date"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"

interface SubscriptionDetailCardProps {
  subscription: Subscription
  onCancel: () => void
  cancelling?: boolean
}

/** Map subscription status to StatusBadge variant */
function statusVariant(s: string) {
  if (s === "active" || s === "trialing") return "active" as const
  if (s === "past_due") return "pending" as const
  if (s === "cancelled") return "error" as const
  return "draft" as const
}

const STATUS_LABELS: Record<string, string> = {
  active: "Đang hoạt động",
  trialing: "Dùng thử",
  past_due: "Quá hạn",
  cancelled: "Đã hủy",
}

/**
 * Current subscription info card for G2 page.
 * Shows plan, status, billing cycle, period, payment method, actions.
 */
export function SubscriptionDetailCard({
  subscription,
  onCancel,
  cancelling,
}: SubscriptionDetailCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">
            Gói dịch vụ hiện tại
          </h3>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[18px] font-bold text-foreground">
              {subscription.planName ?? "—"}
            </span>
            <StatusBadge
              status={statusVariant(subscription.status)}
              label={STATUS_LABELS[subscription.status] ?? subscription.status}
            />
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-[13px]">
        <div>
          <dt className="text-text-muted">Chu kỳ thanh toán</dt>
          <dd className="mt-0.5 text-text-body font-medium">
            {BILLING_CYCLE_LABELS[subscription.billingCycle]}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Phương thức</dt>
          <dd className="mt-0.5 text-text-body font-medium">
            {subscription.paymentMethod ?? "Chưa thiết lập"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Bắt đầu</dt>
          <dd className="mt-0.5 text-text-body tabular-nums">
            {formatDate(subscription.currentPeriodStart)}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Kết thúc</dt>
          <dd className="mt-0.5 text-text-body tabular-nums">
            {formatDate(subscription.currentPeriodEnd)}
          </dd>
        </div>
      </dl>

      {subscription.cancelAtPeriodEnd && (
        <p className="mt-3 text-[12px] text-[#D97706]">
          Gói sẽ bị hủy vào cuối chu kỳ hiện tại.
        </p>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center gap-2">
        <Link
          href="/billing"
          className="inline-flex items-center justify-center rounded-[8px] border border-primary bg-white text-primary hover:bg-primary-light h-8 px-3 text-xs font-semibold transition-all"
        >
          Đổi gói
        </Link>
        <Button variant="ghost" size="sm" disabled>
          Đổi chu kỳ
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-[#DC2626] hover:text-[#DC2626]"
          onClick={onCancel}
          disabled={
            cancelling ||
            subscription.status === "cancelled" ||
            subscription.cancelAtPeriodEnd
          }
        >
          {cancelling ? "Đang hủy..." : "Hủy gói"}
        </Button>
      </div>
    </div>
  )
}
