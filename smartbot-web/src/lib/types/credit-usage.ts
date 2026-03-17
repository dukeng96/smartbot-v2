/**
 * Credit usage summary for the current billing period.
 */
export interface CreditUsage {
  creditsAllocated: number
  creditsUsed: number
  topUpCredits: number
  periodStart: string
  periodEnd: string
}
