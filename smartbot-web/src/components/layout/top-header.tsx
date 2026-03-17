"use client"

import { ChevronDown, LogOut, Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useUiStore } from "@/lib/stores/ui-store"

export function TopHeader() {
  const { user, tenant } = useAuthStore()
  const { setSidebarMobileOpen } = useUiStore()

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U"

  return (
    <header className="flex h-[var(--height-header)] items-center justify-between border-b border-border bg-card px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={() => setSidebarMobileOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      {/* Spacer for desktop */}
      <div className="hidden lg:block" />

      {/* Right side: workspace + user */}
      <div className="flex items-center gap-3">
        {tenant && (
          <span className="text-[12px] text-text-secondary">
            {tenant.name}
          </span>
        )}
        <Separator orientation="vertical" className="h-5" />
        <span className="text-[13px] font-medium text-foreground">
          {user?.fullName ?? "User"}
        </span>
        <Avatar size="sm">
          {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName ?? ""} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <ChevronDown className="size-4 text-text-muted" />
        <Button variant="ghost" size="icon-sm" aria-label="Đăng xuất">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  )
}
