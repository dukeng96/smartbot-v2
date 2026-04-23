import type { Tenant, TenantMember } from "@/lib/types/tenant"
import type { PaginatedResponse, ListParams } from "@/lib/types/api-responses"
import type { UserRole } from "@/lib/stores/auth-store"

import { apiGet, apiPost, apiPatch, apiDelete } from "./client"

export interface UpdateTenantPayload {
  name?: string
}

export const tenantsApi = {
  getTenant: (id: string) =>
    apiGet<Tenant>(`api/v1/tenants/${id}`),

  updateTenant: (id: string, data: UpdateTenantPayload) =>
    apiPatch<Tenant>(`api/v1/tenants/${id}`, data),

  getMembers: (tenantId: string, params?: ListParams) =>
    apiGet<PaginatedResponse<TenantMember>>(
      `api/v1/tenants/${tenantId}/members`,
      params as Record<string, string | number | boolean | undefined>,
    ),

  inviteMember: (tenantId: string, email: string, role: UserRole) =>
    apiPost<TenantMember>(`api/v1/tenants/${tenantId}/members`, { email, role }),

  updateMemberRole: (tenantId: string, userId: string, role: UserRole) =>
    apiPatch<TenantMember>(`api/v1/tenants/${tenantId}/members/${userId}`, { role }),

  removeMember: (tenantId: string, userId: string) =>
    apiDelete(`api/v1/tenants/${tenantId}/members/${userId}`),
}
