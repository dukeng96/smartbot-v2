import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  children?: ReactNode
}

/**
 * Centered empty state — icon + message + optional children.
 * Used when data arrays are empty on list pages.
 */
export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Icon className="size-6 text-text-muted" />
      </div>
      <h3 className="mt-4 text-[14px] font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-[13px] text-text-secondary">{description}</p>
      )}
      {children}
    </div>
  )
}
