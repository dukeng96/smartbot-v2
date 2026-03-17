/**
 * Tenant (workspace) interface — matches backend Tenant entity.
 */
export interface Tenant {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  planId: string | null
  status: "active" | "suspended" | "deleted"
  settings: Record<string, unknown> | null
  createdAt: string
}

/**
 * Tenant member — returned by GET /api/v1/tenants/:id/members.
 */
export interface TenantMember {
  id: string
  userId: string
  tenantId: string
  role: "owner" | "admin" | "member" | "viewer"
  status: "active" | "invited"
  joinedAt: string
  user: {
    id: string
    email: string
    fullName: string | null
    avatarUrl: string | null
  }
}
