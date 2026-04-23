"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"

import { attachKbSchema, type AttachKbInput } from "@/lib/validations/bot-schemas"
import { listKnowledgeBases } from "@/lib/api/knowledge-bases-api"
import { useAttachKb } from "@/lib/hooks/use-bot-integrations"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

interface BotKbAttachDialogProps {
  botId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** IDs of KBs already attached to this bot — excluded from dropdown */
  attachedKbIds?: string[]
}

export function BotKbAttachDialog({ botId, open, onOpenChange, attachedKbIds = [] }: BotKbAttachDialogProps) {
  const attachKb = useAttachKb(botId)

  const { data: kbList } = useQuery({
    queryKey: ["knowledge-bases", { limit: 100 }],
    queryFn: () => listKnowledgeBases({ limit: 100 }),
    enabled: open,
  })

  const form = useForm<AttachKbInput>({
    resolver: zodResolver(attachKbSchema),
    defaultValues: { knowledgeBaseId: "" },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    await attachKb.mutateAsync(data)
    onOpenChange(false)
    form.reset()
  })

  // Filter out already-attached KBs
  const availableKbs = (kbList?.items ?? []).filter(
    (kb) => !attachedKbIds.includes(kb.id),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Gắn Knowledge Base</DialogTitle>
          <DialogDescription>
            Chọn Knowledge Base để gắn vào Assistant
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium">Knowledge Base</label>
            <Controller
              control={form.control}
              name="knowledgeBaseId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn Knowledge Base..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableKbs.map((kb) => (
                      <SelectItem key={kb.id} value={kb.id}>
                        {kb.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.knowledgeBaseId && (
              <p className="text-[12px] text-destructive">
                {form.formState.errors.knowledgeBaseId.message}
              </p>
            )}
            {availableKbs.length === 0 && (
              <p className="text-[12px] text-text-muted">
                Tất cả Knowledge Base đã được gắn vào Assistant này
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={attachKb.isPending || availableKbs.length === 0}>
              {attachKb.isPending ? "Đang gắn..." : "Gắn"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
