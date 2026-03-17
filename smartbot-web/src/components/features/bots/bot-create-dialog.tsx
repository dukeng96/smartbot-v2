"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { createBotSchema, type CreateBotInput } from "@/lib/validations/bot-schemas"
import { useCreateBot } from "@/lib/hooks/use-bots"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

interface BotCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BotCreateDialog({ open, onOpenChange }: BotCreateDialogProps) {
  const router = useRouter()
  const createBot = useCreateBot()

  const form = useForm<CreateBotInput>({
    resolver: zodResolver(createBotSchema),
    defaultValues: { name: "", description: "" },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    const bot = await createBot.mutateAsync(data)
    onOpenChange(false)
    form.reset()
    router.push(`/bots/${bot.id}/config`)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Tạo Assistant mới</DialogTitle>
          <DialogDescription>Nhập thông tin cơ bản cho assistant của bạn</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">
              Tên <span className="text-destructive">*</span>
            </label>
            <Input
              {...form.register("name")}
              placeholder="VD: Trợ lý bán hàng"
              className="text-[13px]"
            />
            {form.formState.errors.name && (
              <p className="text-[12px] text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">Mô tả</label>
            <Textarea
              {...form.register("description")}
              placeholder="Mô tả ngắn về assistant..."
              rows={3}
              className="text-[13px]"
            />
            {form.formState.errors.description && (
              <p className="text-[12px] text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={createBot.isPending}>
              {createBot.isPending ? "Đang tạo..." : "Tạo Assistant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
