"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"

import type { Plan } from "@/lib/types/plan"
import { formatVnd } from "@/lib/utils/format-currency"
import { formatNumber } from "@/lib/utils/format-number"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PlansPricingTableProps {
  plans: Plan[]
  currentPlanSlug?: string
  onSelectPlan: (plan: Plan, cycle: "monthly" | "yearly") => void
}

const FEATURE_LABELS: { key: string; label: string }[] = [
  { key: "analytics", label: "Phân tích & thống kê" },
  { key: "saveConversations", label: "Lưu cuộc hội thoại" },
  { key: "voiceInput", label: "Nhập liệu bằng giọng nói" },
  { key: "customCss", label: "Tùy chỉnh CSS" },
  { key: "removeBranding", label: "Xóa watermark Smartbot" },
  { key: "facebookIntegration", label: "Tích hợp Facebook" },
  { key: "humanHandover", label: "Chuyển tiếp nhân viên" },
  { key: "leadGeneration", label: "Thu thập thông tin" },
  { key: "apiAccess", label: "Truy cập API" },
  { key: "slaGuarantee", label: "Cam kết SLA" },
  { key: "advancedModels", label: "Mô hình nâng cao" },
]

/**
 * Plan pricing cards with monthly/yearly toggle.
 * 4 cards in a row, current plan disabled, popular plan highlighted.
 */
export function PlansPricingTable({
  plans,
  currentPlanSlug,
  onSelectPlan,
}: PlansPricingTableProps) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly")

  const popularSlugs = ["advanced", "pro-monthly", "growth"]

  return (
    <div className="space-y-6">
      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setCycle("monthly")}
          className={cn(
            "rounded-lg px-4 py-2 text-[13px] font-medium transition-colors",
            cycle === "monthly"
              ? "bg-primary text-white"
              : "bg-muted text-text-secondary hover:bg-muted/80",
          )}
        >
          Hàng tháng
        </button>
        <button
          onClick={() => setCycle("yearly")}
          className={cn(
            "rounded-lg px-4 py-2 text-[13px] font-medium transition-colors",
            cycle === "yearly"
              ? "bg-primary text-white"
              : "bg-muted text-text-secondary hover:bg-muted/80",
          )}
        >
          Hàng năm
          <span className="ml-1.5 text-[11px] text-[#059669] font-semibold">
            -30%
          </span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.slug === currentPlanSlug
          const isPopular = popularSlugs.includes(plan.slug)
          const price =
            cycle === "monthly" ? plan.priceMonthly : plan.priceYearly

          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              price={price}
              cycle={cycle}
              isCurrent={isCurrent}
              isPopular={isPopular}
              onSelect={() => onSelectPlan(plan, cycle)}
            />
          )
        })}
      </div>
    </div>
  )
}

/** Individual plan card */
function PlanCard({
  plan,
  price,
  cycle,
  isCurrent,
  isPopular,
  onSelect,
}: {
  plan: Plan
  price: number
  cycle: "monthly" | "yearly"
  isCurrent: boolean
  isPopular: boolean
  onSelect: () => void
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border bg-card p-5",
        isPopular
          ? "border-[#6D28D9] border-t-[3px]"
          : "border-border",
      )}
    >
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#6D28D9] px-3 py-0.5 text-[11px] font-medium text-white">
          Phổ biến
        </span>
      )}

      <h3 className="text-[16px] font-semibold text-foreground">
        {plan.name}
      </h3>
      <p className="mt-1 text-[12px] text-text-secondary">
        {plan.description}
      </p>

      <div className="mt-4">
        <span className="text-[28px] font-bold text-foreground leading-none">
          {price === 0 ? "Miễn phí" : formatVnd(price)}
        </span>
        {price > 0 && (
          <span className="text-[13px] text-text-muted">
            /{cycle === "monthly" ? "tháng" : "năm"}
          </span>
        )}
      </div>

      {/* Limits */}
      <ul className="mt-4 space-y-1.5 text-[12px] text-text-secondary">
        <li>{plan.maxBots} Assistants</li>
        <li>{formatNumber(plan.maxCreditsPerMonth)} credits/tháng</li>
        <li>{formatNumber(plan.maxKnowledgeCharsPerBot)} ký tự/bot</li>
        <li>{plan.maxTeamMembers} thành viên</li>
      </ul>

      {/* Feature checklist */}
      <ul className="mt-4 flex-1 space-y-1.5 border-t border-border pt-4">
        {FEATURE_LABELS.map(({ key, label }) => {
          const val = plan.features[key as keyof typeof plan.features]
          const enabled = typeof val === "boolean" ? val : val > 0
          return (
            <li
              key={key}
              className={cn(
                "flex items-center gap-2 text-[12px]",
                enabled ? "text-text-body" : "text-text-muted",
              )}
            >
              {enabled ? (
                <Check className="size-3.5 text-[#059669]" />
              ) : (
                <X className="size-3.5 text-[#D1D5DB]" />
              )}
              {label}
            </li>
          )
        })}
      </ul>

      {/* CTA */}
      <Button
        className="mt-5 w-full"
        variant={isCurrent ? "outline" : "default"}
        disabled={isCurrent}
        onClick={onSelect}
      >
        {isCurrent ? "Gói hiện tại" : "Nâng cấp"}
      </Button>
    </div>
  )
}
