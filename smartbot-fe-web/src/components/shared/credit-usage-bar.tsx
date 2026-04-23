import Link from "next/link"

import { cn } from "@/lib/utils"

interface CreditUsageBarProps {
  used: number
  allocated: number
  /** Show top-up link */
  topUp?: boolean
  className?: string
}

/**
 * Credit usage bar — used in sidebar bottom, B2, G2, G3.
 * Shows usage progress + optional top-up link.
 */
export function CreditUsageBar({ used, allocated, topUp = false, className }: CreditUsageBarProps) {
  const percentage = allocated > 0 ? Math.round((used / allocated) * 100) : 0
  const isHigh = percentage >= 80

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-text-muted">Credits</span>
        <span className="tabular-nums text-text-secondary">
          {used.toLocaleString("vi-VN")} / {allocated.toLocaleString("vi-VN")}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isHigh ? "bg-[#D97706]" : "bg-primary",
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {topUp && (
        <Link
          href="/billing/top-up"
          className="block text-[12px] font-medium text-primary hover:underline"
        >
          Mua thêm credits
        </Link>
      )}
    </div>
  )
}
