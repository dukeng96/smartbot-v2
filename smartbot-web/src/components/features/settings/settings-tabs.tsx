"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const SETTINGS_TABS = [
  { label: "Hồ sơ", href: "/settings" },
  { label: "Workspace", href: "/settings/workspace" },
  { label: "Nhóm", href: "/settings/team" },
] as const

/**
 * Shared settings tab navigation — underline style.
 * Active tab: #6D28D9 text + 2px bottom border.
 * Inactive tab: #6B7280 text, hover #374151.
 */
export function SettingsTabs() {
  const pathname = usePathname()

  return (
    <div className="flex gap-6 border-b border-border">
      {SETTINGS_TABS.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "pb-2.5 text-[13px] font-medium transition-colors",
              isActive
                ? "border-b-2 border-primary text-primary"
                : "text-text-secondary hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
