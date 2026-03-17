import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

/**
 * C4 — Widget config + preview tab.
 * Two-column: config form (left) + live widget preview (right).
 */
export default function BotWidgetPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-[var(--font-size-section-heading)] font-semibold text-foreground">
        Cấu hình Widget
      </h2>
      {/* TODO: Two-column layout — form + preview panel */}
      <LoadingSkeleton variant="form" />
    </div>
  )
}
