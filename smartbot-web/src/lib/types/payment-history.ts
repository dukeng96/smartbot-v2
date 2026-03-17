/**
 * Single payment record — subscription, top-up, or refund.
 */
export interface PaymentRecord {
  id: string
  type: PaymentType
  amount: number
  currency: string
  status: PaymentStatus
  paymentMethod: string | null
  gatewayTransactionId: string | null
  description: string
  createdAt: string
}

export type PaymentType = "subscription" | "top_up" | "refund"

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded"

/** Vietnamese labels for payment types */
export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  subscription: "Gói dịch vụ",
  top_up: "Nạp thêm",
  refund: "Hoàn tiền",
}
