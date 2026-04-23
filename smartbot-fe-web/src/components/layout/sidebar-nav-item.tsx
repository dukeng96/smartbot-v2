"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface SidebarNavItemProps {
  label: string
  href: string
  icon: LucideIcon
  matchPaths?: string[]
}

export function SidebarNavItem({ label, href, icon: Icon, matchPaths }: SidebarNavItemProps) {
  const pathname = usePathname()

  const isActive =
    href === "/"
      ? pathname === "/"
      : matchPaths
        ? matchPaths.some((p) => pathname.startsWith(p))
        : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-[6px] px-3 py-2 text-[13px] font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  )
}
