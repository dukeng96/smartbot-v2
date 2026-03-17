import { Database } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"

/**
 * C6 — Attached knowledge bases tab.
 * List of KBs linked to this bot + add/remove controls.
 */
export default function BotKnowledgeBasesPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-[var(--font-size-section-heading)] font-semibold text-foreground">
        Knowledge Bases
      </h2>
      {/* TODO: Table of attached KBs + attach/detach actions */}
      <EmptyState
        icon={Database}
        title="Chưa gắn Knowledge Base"
        description="Gắn Knowledge Base để assistant có thể trả lời dựa trên tài liệu của bạn"
      />
    </div>
  )
}
