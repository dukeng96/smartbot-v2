"use client"

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { MessageSquare, Database, Link2 } from "lucide-react"

import type { Bot } from "@/lib/types/bot"
import { updateBotSchema, type UpdateBotInput } from "@/lib/validations/bot-schemas"
import { useUpdateBot } from "@/lib/hooks/use-bots"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"

interface BotConfigFormProps {
  bot: Bot
  onDuplicate: () => void
  onDelete: () => void
}

export function BotConfigForm({ bot, onDuplicate, onDelete }: BotConfigFormProps) {
  const updateBot = useUpdateBot(bot.id)

  const form = useForm<UpdateBotInput>({
    resolver: zodResolver(updateBotSchema),
    defaultValues: {
      name: bot.name,
      description: bot.description ?? "",
      status: bot.status === "archived" ? "draft" : bot.status,
      citationEnabled: bot.citationEnabled ?? true,
    },
  })

  // Sync form when bot data changes
  useEffect(() => {
    form.reset({
      name: bot.name,
      description: bot.description ?? "",
      status: bot.status === "archived" ? "draft" : bot.status,
      citationEnabled: bot.citationEnabled ?? true,
    })
  }, [bot, form])

  const onSubmit = form.handleSubmit((data) => updateBot.mutate(data))

  const usagePercent = bot.maxKnowledgeChars > 0
    ? Math.round((bot.currentKnowledgeChars / bot.maxKnowledgeChars) * 100)
    : 0

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Basic Info */}
      <section className="space-y-4">
        <h3 className="text-[14px] font-semibold text-foreground">Thông tin cơ bản</h3>
        <div className="space-y-2">
          <label className="text-[13px] font-medium">Tên Assistant</label>
          <Input {...form.register("name")} className="max-w-md truncate text-[13px]" />
          {form.formState.errors.name && (
            <p className="text-[12px] text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium">Mô tả</label>
          <Textarea {...form.register("description")} rows={3} className="max-w-md text-[13px]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium">Trạng thái</label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex items-center justify-between max-w-md">
          <div>
            <label className="text-[13px] font-medium">Hiển thị nguồn trích dẫn</label>
            <p className="text-[12px] text-muted-foreground">
              Hiển thị [1] [2] để chỉ nguồn từ Knowledge Base
            </p>
          </div>
          <Controller
            control={form.control}
            name="citationEnabled"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </section>

      {/* Statistics */}
      <section className="space-y-4">
        <h3 className="text-[14px] font-semibold text-foreground">Thống kê</h3>
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={Database} label="Dung lượng" value={`${usagePercent}%`}>
            <Progress value={usagePercent} className="mt-2" />
          </StatCard>
          <StatCard icon={MessageSquare} label="Hội thoại" value={String(bot._count?.conversations ?? 0)} />
          <StatCard icon={Link2} label="Kênh kết nối" value={String(bot._count?.channels ?? 0)} />
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3 border-t border-border pt-6">
        <Button type="button" variant="outline" onClick={onDuplicate}>Nhân bản</Button>
        <Button type="button" variant="destructive" onClick={onDelete}>Xóa Assistant</Button>
        <div className="flex-1" />
        <Button type="submit" disabled={updateBot.isPending}>
          {updateBot.isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  )
}

function StatCard({ icon: Icon, label, value, children }: {
  icon: React.ElementType; label: string; value: string; children?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-[12px] text-text-muted">
        <Icon className="size-4" /> {label}
      </div>
      <p className="mt-1 text-[18px] font-semibold text-foreground">{value}</p>
      {children}
    </div>
  )
}
