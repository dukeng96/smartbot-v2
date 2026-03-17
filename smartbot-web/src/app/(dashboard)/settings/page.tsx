import { PageHeader } from "@/components/layout/page-header"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

/**
 * H1 — Profile settings.
 * Form: fullName, email (read-only), avatar, change password.
 * Data: GET /api/v1/users/me, PATCH /api/v1/users/me
 */
export default function ProfileSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt" description="Quản lý thông tin cá nhân" />

      {/* TODO: Profile form (React Hook Form + Zod) */}
      <LoadingSkeleton variant="form" />
    </div>
  )
}
