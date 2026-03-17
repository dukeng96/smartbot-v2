"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useBots } from "@/lib/hooks/use-bots"

interface AnalyticsBotSelectorProps {
  value: string | undefined
  onChange: (botId: string | undefined) => void
}

/**
 * Dropdown to filter analytics by a specific bot.
 * Shows "Tat ca Assistant" as default option.
 */
export function AnalyticsBotSelector({ value, onChange }: AnalyticsBotSelectorProps) {
  const { data } = useBots({ limit: 100 })
  const bots = data?.items ?? []

  return (
    <Select
      value={value ?? "__all__"}
      onValueChange={(val) => onChange(val === "__all__" ? undefined : (val as string))}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Tất cả Assistant" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">Tất cả Assistant</SelectItem>
        {bots.map((bot) => (
          <SelectItem key={bot.id} value={bot.id}>
            {bot.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
