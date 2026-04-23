"use client"

import { LogOut, Menu, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useUiStore } from "@/lib/stores/ui-store"
import { useLogout } from "@/lib/hooks/use-auth"
import { useRouter } from "next/navigation"

export function TopHeader() {
  const { user, tenant } = useAuthStore()
  const { setSidebarMobileOpen } = useUiStore()
  const { mutate: logout, isPending: isLoggingOut } = useLogout()
  const router = useRouter()

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
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-sm px-2 py-1 hover:bg-muted outline-none">
            <span className="text-[13px] font-medium text-foreground">
              {user?.fullName ?? "User"}
            </span>
            <Avatar size="sm">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName ?? ""} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 size-4" />
              Cài đặt
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              disabled={isLoggingOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 size-4" />
              {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
