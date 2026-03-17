"use client"

import Link from "next/link"

import { SIDEBAR_NAV_ITEMS } from "@/lib/constants/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarNavItem } from "./sidebar-nav-item"
import { SidebarCreditsIndicator } from "./sidebar-credits-indicator"

export function SidebarNavigation() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[var(--width-sidebar)] flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-[var(--height-header)] items-center px-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">S</span>
          </div>
          <span className="text-[16px] font-semibold text-foreground">Smartbot</span>
        </Link>
      </div>

      <Separator />

      {/* Nav Items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {SIDEBAR_NAV_ITEMS.map((item) => (
          <SidebarNavItem key={item.href} {...item} />
        ))}
      </nav>

      <Separator />

      {/* Credits Indicator */}
      <SidebarCreditsIndicator />
    </aside>
  )
}
