"use client"

import { PageHeader } from "@/components/layout/page-header"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ErrorState } from "@/components/shared/error-state"
import { SettingsTabs } from "@/components/features/settings/settings-tabs"
import { ProfileForm } from "@/components/features/settings/profile-form"
import { useCurrentUser } from "@/lib/hooks/use-user"

/**
 * H1 — Profile settings page.
 * Fetches current user data and renders profile form.
 */
export default function ProfileSettingsPage() {
  const { data: user, isLoading, isError, refetch } = useCurrentUser()

  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt" description="Quản lý thông tin cá nhân" />
      <SettingsTabs />

      {isLoading && <LoadingSkeleton variant="form" />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {user && <ProfileForm user={user} />}
    </div>
  )
}
