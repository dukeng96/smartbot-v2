import type { Plan } from "@/lib/types/plan"
import type { Subscription } from "@/lib/types/subscription"
import type { CreditUsage } from "@/lib/types/credit-usage"
import type { PaymentRecord } from "@/lib/types/payment-history"
import type { PaginatedResponse, ListParams } from "@/lib/types/api-responses"
import { apiGet, apiPost, apiPatch, apiDelete } from "./client"

/** List all available plans */
export function getPlans() {
  return apiGet<Plan[]>("api/v1/plans")
}

/** Get current user subscription */
export function getSubscription() {
  return apiGet<Subscription>("api/v1/subscription")
}

/** Create a new subscription */
export function createSubscription(data: {
  planId: string
  billingCycle: string
}) {
  return apiPost<Subscription>("api/v1/subscription", data)
}

/** Update subscription (change plan or cycle) */
export function updateSubscription(data: {
  planId?: string
  billingCycle?: string
}) {
  return apiPatch<Subscription>("api/v1/subscription", data)
}

/** Cancel subscription */
export function cancelSubscription() {
  return apiDelete("api/v1/subscription")
}

/** Get credit usage for current period */
export function getCreditUsage() {
  return apiGet<CreditUsage>("api/v1/credits/usage")
}

/** Purchase additional credits */
export function topUpCredits(data: {
  credits: number
  paymentMethod: string
}) {
  return apiPost("api/v1/credits/top-up", data)
}

/** Payment history list params */
export interface PaymentListParams extends ListParams {
  type?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

/** List payment history */
export function getPayments(params?: PaymentListParams) {
  return apiGet<PaginatedResponse<PaymentRecord>>(
    "api/v1/payments",
    params as Record<string, string>,
  )
}
