"use client"

import { useQuery } from "@tanstack/react-query"

import { PageHeader } from "@/components/layout/page-header"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ErrorState } from "@/components/shared/error-state"
import { SettingsTabs } from "@/components/features/settings/settings-tabs"
import { WorkspaceForm } from "@/components/features/settings/workspace-form"
import { useAuthStore } from "@/lib/stores/auth-store"
import { tenantsApi } from "@/lib/api/tenants-api"

/**
 * H2 — Workspace settings page.
 * Fetches tenant data and renders workspace form.
 */
export default function WorkspaceSettingsPage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)

  const { data: tenant, isLoading, isError, refetch } = useQuery({
    queryKey: ["tenants", tenantId],
    queryFn: () => tenantsApi.getTenant(tenantId!),
    enabled: !!tenantId,
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt" description="Cài đặt workspace chung" />
      <SettingsTabs />

      {isLoading && <LoadingSkeleton variant="form" />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {tenant && <WorkspaceForm tenant={tenant} />}
    </div>
  )
}
