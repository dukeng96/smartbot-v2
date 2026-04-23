"use client"

import type { ReactNode } from "react"

import { SidebarNavigation } from "./sidebar-navigation"
import { MobileSidebarOverlay } from "./mobile-sidebar-overlay"
import { TopHeader } from "./top-header"

interface AppShellProps {
  children: ReactNode
}

/**
 * Dashboard shell: fixed sidebar (220px) + header + main content area.
 * Wraps all (dashboard) route group pages.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop fixed */}
      <div className="hidden lg:block">
        <SidebarNavigation />
      </div>

      {/* Mobile sidebar overlay */}
      <MobileSidebarOverlay />

      {/* Main area — offset by sidebar width on desktop */}
      <div className="flex flex-1 flex-col lg:ml-[var(--width-sidebar)]">
        <TopHeader />
        <main className="flex-1 p-[var(--spacing-content-pad)]">
          {children}
        </main>
      </div>
    </div>
  )
}
