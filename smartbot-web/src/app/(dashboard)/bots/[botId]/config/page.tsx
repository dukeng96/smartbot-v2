import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

/**
 * C2 — Bot general config tab.
 * Form: name, description, status, model, temperature.
 */
export default function BotConfigPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-[var(--font-size-section-heading)] font-semibold text-foreground">
        Cấu hình chung
      </h2>
      {/* TODO: Bot config form (React Hook Form + Zod) */}
      <LoadingSkeleton variant="form" />
    </div>
  )
}
