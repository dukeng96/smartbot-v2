"use client"

import { cn } from "@/lib/utils"

export type PeriodValue = "7d" | "30d" | "90d"

const PERIOD_OPTIONS: { value: PeriodValue; label: string }[] = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "90d", label: "90 ngày" },
]

interface PeriodFilterProps {
  value: PeriodValue
  onChange: (value: PeriodValue) => void
  className?: string
}

/**
 * Period selector for analytics pages — segmented control style.
 * Used on F1, F2 analytics screens.
 */
export function PeriodFilter({ value, onChange, className }: PeriodFilterProps) {
  return (
    <div className={cn("inline-flex items-center rounded-lg border border-border bg-card p-0.5", className)}>
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
            value === opt.value
              ? "bg-primary text-white"
              : "text-text-secondary hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
