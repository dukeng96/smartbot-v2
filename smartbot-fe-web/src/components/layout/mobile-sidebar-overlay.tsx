"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"

import { useUiStore } from "@/lib/stores/ui-store"
import { SidebarNavigation } from "./sidebar-navigation"
import { Button } from "@/components/ui/button"

/**
 * Mobile sidebar overlay — slides in from left on small screens.
 * Renders the same SidebarNavigation used on desktop.
 * Closes on backdrop click, close button, or route change.
 */
export function MobileSidebarOverlay() {
  const { sidebarMobileOpen, setSidebarMobileOpen } = useUiStore()
  const pathname = usePathname()

  // Close on route change
  useEffect(() => {
    setSidebarMobileOpen(false)
  }, [pathname, setSidebarMobileOpen])

  // Prevent body scroll when open
  useEffect(() => {
    if (sidebarMobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [sidebarMobileOpen])

  return (
    <div className="lg:hidden">
      {/* Backdrop */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={() => setSidebarMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[var(--width-sidebar)] transform transition-transform duration-200 ease-in-out ${
          sidebarMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarNavigation />

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-2 top-3 z-50 text-text-muted hover:text-foreground"
          onClick={() => setSidebarMobileOpen(false)}
          aria-label="Đóng menu"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
