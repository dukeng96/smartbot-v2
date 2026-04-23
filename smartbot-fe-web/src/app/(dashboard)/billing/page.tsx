"use client"

import { useState } from "react"

import type { Plan } from "@/lib/types/plan"
import { PageHeader } from "@/components/layout/page-header"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { StatusBadge } from "@/components/shared/status-badge"
import { PlansPricingTable } from "@/components/features/billing/plans-pricing-table"
import { PlanSelectDialog } from "@/components/features/billing/plan-select-dialog"
import { usePlans, useSubscription, useCreateSubscription } from "@/lib/hooks/use-billing"

/**
 * G1 — Plans pricing page.
 * Monthly/yearly toggle + 4 plan cards.
 */
export default function BillingPlansPage() {
  const { data: plans, isLoading: plansLoading, isError: plansError, refetch: refetchPlans } = usePlans()
  const { data: subscription } = useSubscription()
  const createSub = useCreateSubscription()

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [selectedCycle, setSelectedCycle] = useState<"monthly" | "yearly">("monthly")
  const [dialogOpen, setDialogOpen] = useState(false)

  if (plansLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Gói dịch vụ" description="Chọn gói phù hợp với nhu cầu của bạn" />
        <LoadingSkeleton variant="cards" rows={4} />
      </div>
    )
  }

  if (plansError || !plans) {
    return (
      <div className="space-y-6">
        <PageHeader title="Gói dịch vụ" description="Chọn gói phù hợp với nhu cầu của bạn" />
        <ErrorState onRetry={() => refetchPlans()} />
      </div>
    )
  }

  const handleSelectPlan = (plan: Plan, cycle: "monthly" | "yearly") => {
    setSelectedPlan(plan)
    setSelectedCycle(cycle)
    setDialogOpen(true)
  }

  const handleConfirm = () => {
    if (!selectedPlan) return
    createSub.mutate(
      { planId: selectedPlan.id, billingCycle: selectedCycle },
      { onSuccess: () => setDialogOpen(false) },
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gói dịch vụ"
        description="Chọn gói phù hợp với nhu cầu của bạn"
        actions={
          subscription?.planSlug ? (
            <StatusBadge status="subscription" label={`Gói ${subscription.planName ?? subscription.planSlug}`} />
          ) : undefined
        }
      />

      <PlansPricingTable
        plans={plans}
        currentPlanSlug={subscription?.planSlug}
        onSelectPlan={handleSelectPlan}
      />

      <PlanSelectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        plan={selectedPlan}
        cycle={selectedCycle}
        isUpgrade={true}
        onConfirm={handleConfirm}
        loading={createSub.isPending}
      />
    </div>
  )
}
