"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"

import { attachKbSchema, type AttachKbInput } from "@/lib/validations/bot-schemas"
import { knowledgeBasesApi } from "@/lib/api/knowledge-bases-api"
import { useAttachKb } from "@/lib/hooks/use-bot-integrations"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
}

export function BotKbAttachDialog({ botId, open, onOpenChange }: BotKbAttachDialogProps) {
  const attachKb = useAttachKb(botId)

  const { data: kbList } = useQuery({
    queryKey: ["knowledge-bases", { limit: 100 }],
    queryFn: () => knowledgeBasesApi.list({ limit: 100 }),
    enabled: open,
  })

  const form = useForm<AttachKbInput>({
    resolver: zodResolver(attachKbSchema),
    defaultValues: { knowledgeBaseId: "", priority: 1 },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    await attachKb.mutateAsync(data)
    onOpenChange(false)
    form.reset()
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Gắn Knowledge Base</DialogTitle>
          <DialogDescription>
            Chọn Knowledge Base và mức ưu tiên tìm kiếm
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
                    {kbList?.items.map((kb) => (
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
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium">Ưu tiên</label>
            <Input
              type="number"
              {...form.register("priority", { valueAsNumber: true })}
              min={1}
              className="w-32 text-[13px]"
            />
            {form.formState.errors.priority && (
              <p className="text-[12px] text-destructive">
                {form.formState.errors.priority.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={attachKb.isPending}>
              {attachKb.isPending ? "Đang gắn..." : "Gắn"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
