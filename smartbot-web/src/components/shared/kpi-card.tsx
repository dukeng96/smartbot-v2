import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  /** Optional progress bar (0-100) */
  progress?: { value: number; max: number }
  className?: string
}

/**
 * KPI metric card — label, value, optional icon and progress bar.
 * Used on Dashboard (B2), Analytics (F1), Billing (G2).
 */
export function KpiCard({ label, value, icon: Icon, progress, className }: KpiCardProps) {
  const percentage = progress ? Math.round((progress.value / progress.max) * 100) : 0

  return (
    <Card className={cn("p-5", className)}>
      <CardContent className="p-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12px] text-text-muted">{label}</p>
            <p className="mt-1 text-[22px] font-semibold leading-tight text-foreground tabular-nums">
              {value}
            </p>
          </div>
          {Icon && (
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-4 text-text-secondary" />
            </div>
          )}
        </div>
        {progress && (
          <div className="mt-3">
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-text-muted tabular-nums">
              {progress.value} / {progress.max}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
