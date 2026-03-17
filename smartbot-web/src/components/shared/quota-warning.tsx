import Link from "next/link"
import { AlertTriangle } from "lucide-react"

interface QuotaWarningProps {
  current: number
  max: number
  upgradeHref?: string
  entityLabel?: string
}

/**
 * Quota warning banner — shown when entity count approaches plan limit.
 * Used in C1 (bot limit), H3 (member limit).
 */
export function QuotaWarning({
  current,
  max,
  upgradeHref = "/billing",
  entityLabel = "mục",
}: QuotaWarningProps) {
  if (current < max) return null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#D97706]/30 bg-[#FFFBEB] px-4 py-3">
      <AlertTriangle className="size-4 shrink-0 text-[#D97706]" />
      <p className="flex-1 text-[13px] text-[#92400E]">
        Bạn đã sử dụng tối đa {max} {entityLabel} cho gói hiện tại.
      </p>
      <Link
        href={upgradeHref}
        className="shrink-0 text-[13px] font-medium text-primary hover:underline"
      >
        Nâng cấp
      </Link>
    </div>
  )
}
