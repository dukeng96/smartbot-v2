import Link from "next/link"

import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/page-header"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

const SETTINGS_TABS = [
  { label: "Profile", href: "/settings" },
  { label: "Workspace", href: "/settings/workspace" },
  { label: "Team", href: "/settings/team" },
] as const

/**
 * H1 — Profile settings.
 * Form: fullName, email (read-only), avatar, change password.
 * Data: GET /api/v1/users/me, PATCH /api/v1/users/me
 */
export default function ProfileSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt" description="Quản lý thông tin cá nhân" />

      {/* Settings tabs */}
      <div className="flex gap-6 border-b border-border">
        {SETTINGS_TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "pb-2.5 text-[13px] font-medium transition-colors",
              tab.href === "/settings"
                ? "border-b-2 border-primary text-primary"
                : "text-text-secondary hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* TODO: Profile form (React Hook Form + Zod) */}
      <LoadingSkeleton variant="form" />
    </div>
  )
}
