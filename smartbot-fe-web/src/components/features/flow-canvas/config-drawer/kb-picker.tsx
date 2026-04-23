"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/api/client"
import type { PaginatedResult } from "@/lib/types/flow"

interface KbItem {
  id: string
  name: string
  totalDocuments?: number
}

interface KbPickerProps {
  value: string
  onChange: (value: string) => void
}

// Backend returns either PaginatedResult<KbItem> or KbItem[] depending on endpoint version.
type KbListResponse = PaginatedResult<KbItem> | KbItem[]

function unwrapList(res: KbListResponse | undefined): KbItem[] {
  if (!res) return []
  if (Array.isArray(res)) return res
  return res.data ?? []
}

export function KbPicker({ value, onChange }: KbPickerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["knowledge-bases"],
    queryFn: () => apiGet<KbListResponse>("api/v1/knowledge-bases"),
    staleTime: 60_000,
  })

  const kbs = unwrapList(data)

  return (
    <Select value={value} onValueChange={(v) => { if (v) onChange(v) }} disabled={isLoading}>
      <SelectTrigger className="h-8 text-[13px]">
        <SelectValue placeholder={isLoading ? "Đang tải…" : "Chọn Knowledge Base"} />
      </SelectTrigger>
      <SelectContent>
        {kbs.map((kb) => (
          <SelectItem key={kb.id} value={kb.id} className="text-[13px]">
            <span className="font-medium">{kb.name}</span>
            {typeof kb.totalDocuments === "number" && (
              <span className="ml-2 text-muted-foreground text-[11px]">
                {kb.totalDocuments} tài liệu
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
