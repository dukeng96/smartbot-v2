import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active:       { bg: "bg-[#ECFDF5]", text: "text-[#059669]" },
  draft:        { bg: "bg-[#F3F4F6]", text: "text-[#6B7280]" },
  processing:   { bg: "bg-[#EFF6FF]", text: "text-[#2563EB]" },
  error:        { bg: "bg-[#FEF2F2]", text: "text-[#DC2626]" },
  paused:       { bg: "bg-[#FFFBEB]", text: "text-[#D97706]" },
  completed:    { bg: "bg-[#ECFDF5]", text: "text-[#059669]" },
  failed:       { bg: "bg-[#FEF2F2]", text: "text-[#DC2626]" },
  pending:      { bg: "bg-[#FFFBEB]", text: "text-[#D97706]" },
  refunded:     { bg: "bg-[#FFFBEB]", text: "text-[#D97706]" },
  invited:      { bg: "bg-[#EFF6FF]", text: "text-[#2563EB]" },
  subscription: { bg: "bg-[#EDE9FE]", text: "text-[#6D28D9]" },
  "top-up":     { bg: "bg-[#EFF6FF]", text: "text-[#2563EB]" },
  refund:       { bg: "bg-[#FFFBEB]", text: "text-[#D97706]" },
}

export type StatusVariant = keyof typeof STATUS_STYLES

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  draft: "Draft",
  processing: "Processing",
  error: "Error",
  paused: "Paused",
  completed: "Completed",
  failed: "Failed",
  pending: "Pending",
  refunded: "Refunded",
  invited: "Invited",
  subscription: "Subscription",
  "top-up": "Top-up",
  refund: "Refund",
}

interface StatusBadgeProps {
  status: StatusVariant
  label?: string
  className?: string
}

/**
 * Semantic status pill badge — maps status to bg/text color pair.
 * 12px text, pill radius, 4px 10px padding per design spec.
 */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft
  const displayLabel = label ?? STATUS_LABELS[status] ?? status

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-0 text-[12px] font-normal px-2.5 py-1 rounded-full",
        style.bg,
        style.text,
        className,
      )}
    >
      {displayLabel}
    </Badge>
  )
}
