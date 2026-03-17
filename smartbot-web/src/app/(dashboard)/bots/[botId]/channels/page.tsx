import { Link2 } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"

/**
 * C7 — Channel connections tab.
 * Manage Zalo, Messenger, web widget, etc.
 */
export default function BotChannelsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-[var(--font-size-section-heading)] font-semibold text-foreground">
        Kênh kết nối
      </h2>
      {/* TODO: Channel cards (Zalo, Messenger, etc.) */}
      <EmptyState
        icon={Link2}
        title="Chưa kết nối kênh nào"
        description="Kết nối bot với các nền tảng để phục vụ khách hàng"
      />
    </div>
  )
}
