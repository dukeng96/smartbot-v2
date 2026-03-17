/**
 * User subscription — current plan + billing cycle info.
 */
export interface Subscription {
  id: string
  planId: string
  planName?: string
  planSlug?: string
  status: SubscriptionStatus
  billingCycle: BillingCycle
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  paymentMethod: string | null
}

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "trialing"

export type BillingCycle = "weekly" | "monthly" | "yearly"

/** Vietnamese labels for billing cycle */
export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  weekly: "Hàng tuần",
  monthly: "Hàng tháng",
  yearly: "Hàng năm",
}
