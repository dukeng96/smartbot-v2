import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

/**
 * C3 — Bot personality tab.
 * Form: system prompt, greeting message, tone settings.
 */
export default function BotPersonalityPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-[var(--font-size-section-heading)] font-semibold text-foreground">
        Tính cách Assistant
      </h2>
      {/* TODO: Personality form (system prompt textarea, etc.) */}
      <LoadingSkeleton variant="form" />
    </div>
  )
}
