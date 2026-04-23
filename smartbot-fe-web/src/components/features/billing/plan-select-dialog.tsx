"use client"

import type { Plan } from "@/lib/types/plan"
import { formatVnd } from "@/lib/utils/format-currency"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

interface PlanSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: Plan | null
  cycle: "monthly" | "yearly"
  isUpgrade: boolean
  onConfirm: () => void
  loading?: boolean
}

/**
 * Confirm upgrade/downgrade dialog.
 * Shown after user clicks "Nâng cấp" on a plan card.
 */
export function PlanSelectDialog({
  open,
  onOpenChange,
  plan,
  cycle,
  isUpgrade,
  onConfirm,
  loading,
}: PlanSelectDialogProps) {
  if (!plan) return null

  const price = cycle === "monthly" ? plan.priceMonthly : plan.priceYearly
  const cycleLabel = cycle === "monthly" ? "tháng" : "năm"

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isUpgrade ? "Nâng cấp gói dịch vụ" : "Đổi gói dịch vụ"}
      message={`Bạn muốn ${isUpgrade ? "nâng cấp" : "chuyển"} sang gói ${plan.name} với giá ${formatVnd(price)}/${cycleLabel}?`}
      confirmLabel={isUpgrade ? "Nâng cấp" : "Xác nhận"}
      variant="default"
      onConfirm={onConfirm}
      loading={loading}
    />
  )
}
