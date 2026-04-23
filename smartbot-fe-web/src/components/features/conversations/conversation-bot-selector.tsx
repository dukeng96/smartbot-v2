"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Bot {
  id: string
  name: string
}

interface ConversationBotSelectorProps {
  bots: Bot[]
  value?: string
  onChange: (botId: string | undefined) => void
}

/**
 * Bot selector dropdown for filtering conversations.
 * "Tất cả Assistants" when no bot selected.
 */
export function ConversationBotSelector({
  bots,
  value,
  onChange,
}: ConversationBotSelectorProps) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(v) => onChange(!v || v === "all" ? undefined : v)}
    >
      <SelectTrigger className="h-9 w-[200px] text-[13px]">
        <SelectValue placeholder="Tất cả Assistants" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả Assistants</SelectItem>
        {bots.map((bot) => (
          <SelectItem key={bot.id} value={bot.id}>
            {bot.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
