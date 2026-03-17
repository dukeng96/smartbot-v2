"use client"

import type { ReactNode } from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface DataTableToolbarProps {
  /** Search value — controlled */
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  /** Filter dropdowns or other controls — rendered after search */
  filters?: ReactNode
  /** Action buttons — rendered on the right side */
  actions?: ReactNode
  className?: string
}

/**
 * Table toolbar — search input + filter controls + action buttons.
 * Sits between PageHeader and DataTable.
 */
export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Tìm kiếm...",
  filters,
  actions,
  className,
}: DataTableToolbarProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-4", className)}>
      <div className="flex flex-1 items-center gap-3">
        {onSearchChange !== undefined && (
          <div className="relative w-full max-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 pl-9 text-[13px]"
            />
          </div>
        )}
        {filters}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
