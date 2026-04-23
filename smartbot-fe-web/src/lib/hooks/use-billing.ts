"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import type { PaymentListParams } from "@/lib/api/billing-api"
import {
  getPlans,
  getSubscription,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  getCreditUsage,
  topUpCredits,
  getPayments,
} from "@/lib/api/billing-api"

/** All available plans */
export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: getPlans,
  })
}

/** Current subscription */
export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: getSubscription,
  })
}

/** Credit usage for current period */
export function useCreditUsage() {
  return useQuery({
    queryKey: ["credit-usage"],
    queryFn: getCreditUsage,
  })
}

/** Payment history */
export function usePayments(params?: PaymentListParams) {
  return useQuery({
    queryKey: ["payments", params],
    queryFn: () => getPayments(params),
  })
}

/** Create new subscription */
export function useCreateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription"] })
      qc.invalidateQueries({ queryKey: ["credit-usage"] })
    },
  })
}

/** Update subscription (plan or cycle) */
export function useUpdateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription"] })
    },
  })
}

/** Cancel subscription */
export function useCancelSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription"] })
    },
  })
}

/** Purchase additional credits */
export function useTopUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: topUpCredits,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-usage"] })
      qc.invalidateQueries({ queryKey: ["payments"] })
    },
  })
}
