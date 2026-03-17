import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

/**
 * C5 — API key + embed code tab.
 * Shows API key with copy, embed snippet, usage instructions.
 */
export default function BotApiEmbedPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-[var(--font-size-section-heading)] font-semibold text-foreground">
        API & Embed
      </h2>
      {/* TODO: API key display + copy, embed code snippet */}
      <LoadingSkeleton variant="detail" />
    </div>
  )
}
