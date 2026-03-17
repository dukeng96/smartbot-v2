"use client"

import Link from "next/link"

/**
 * Pinned at sidebar bottom — shows credit usage + "Upgrade plan" link.
 * Will receive real data via props/hook in a later phase.
 */
export function SidebarCreditsIndicator() {
  // Placeholder values — will be wired to API in billing phase
  const used = 0
  const total = 100
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between text-[10px] text-text-muted">
        <span>Credits</span>
        <span className="tabular-nums">
          {used} / {total}
        </span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <Link
        href="/billing"
        className="mt-2 block text-[10px] font-medium text-primary hover:underline"
      >
        Upgrade plan
      </Link>
    </div>
  )
}
