/**
 * Billing plan — pricing tier with feature limits.
 */
export interface Plan {
  id: string
  name: string
  slug: string
  description: string
  maxBots: number
  maxCreditsPerMonth: number
  maxKnowledgeCharsPerBot: number
  maxTeamMembers: number
  features: PlanFeatures
  priceMonthly: number
  priceYearly: number
  priceWeekly: number
}

/** Feature flags per plan */
export interface PlanFeatures {
  analytics: boolean
  saveConversations: boolean
  voiceInput: boolean
  customCss: boolean
  removeBranding: boolean
  facebookIntegration: boolean
  humanHandover: boolean
  leadGeneration: boolean
  apiAccess: boolean
  customDomains: number
  slaGuarantee: boolean
  advancedModels: boolean
}
