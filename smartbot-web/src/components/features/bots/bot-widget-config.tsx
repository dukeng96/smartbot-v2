"use client"

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Sun, Moon, Check } from "lucide-react"

import type { Bot } from "@/lib/types/bot"
import { updateWidgetSchema, type UpdateWidgetInput } from "@/lib/validations/bot-schemas"
import { useUpdateWidget } from "@/lib/hooks/use-bots"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

const COLOR_PRESETS = ["#6D28D9", "#2563EB", "#059669", "#DC2626", "#D97706", "#0891B2"]

interface BotWidgetConfigProps {
  bot: Bot
  onChange?: (values: UpdateWidgetInput) => void
}

export function BotWidgetConfig({ bot, onChange }: BotWidgetConfigProps) {
  const updateWidget = useUpdateWidget(bot.id)
  const wc = bot.widgetConfig

  const form = useForm<UpdateWidgetInput>({
    resolver: zodResolver(updateWidgetSchema),
    defaultValues: {
      theme: wc?.theme ?? "light",
      primaryColor: wc?.primaryColor ?? "#6D28D9",
      position: wc?.position ?? "bottom-right",
      bubbleIcon: wc?.bubbleIcon ?? null,
      showPoweredBy: wc?.showPoweredBy ?? true,
      customCss: wc?.customCss ?? "",
      headerText: wc?.headerText ?? "",
    },
  })

  useEffect(() => {
    form.reset({
      theme: wc?.theme ?? "light",
      primaryColor: wc?.primaryColor ?? "#6D28D9",
      position: wc?.position ?? "bottom-right",
      bubbleIcon: wc?.bubbleIcon ?? null,
      showPoweredBy: wc?.showPoweredBy ?? true,
      customCss: wc?.customCss ?? "",
      headerText: wc?.headerText ?? "",
    })
  }, [wc, form])

  // Notify parent on value changes for live preview
  const values = form.watch()
  useEffect(() => { onChange?.(values) }, [values, onChange])

  const onSubmit = form.handleSubmit((data) => updateWidget.mutate(data))

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Theme */}
      <fieldset className="space-y-2">
        <legend className="text-[13px] font-medium">Giao diện</legend>
        <Controller control={form.control} name="theme" render={({ field }) => (
          <div className="flex gap-3">
            {[{ value: "light" as const, icon: Sun, label: "Light" }, { value: "dark" as const, icon: Moon, label: "Dark" }].map((opt) => (
              <button key={opt.value} type="button" onClick={() => field.onChange(opt.value)} className={cn("flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[13px] transition", field.value === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border text-text-secondary hover:border-primary/30")}>
                <opt.icon className="size-4" /> {opt.label}
              </button>
            ))}
          </div>
        )} />
      </fieldset>

      {/* Primary color */}
      <fieldset className="space-y-2">
        <legend className="text-[13px] font-medium">Màu chủ đạo</legend>
        <Controller control={form.control} name="primaryColor" render={({ field }) => (
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {COLOR_PRESETS.map((c) => (
                <button key={c} type="button" onClick={() => field.onChange(c)} className={cn("flex size-8 items-center justify-center rounded-full border-2 transition", field.value === c ? "border-foreground" : "border-transparent")} style={{ backgroundColor: c }}>
                  {field.value === c && <Check className="size-3 text-white" />}
                </button>
              ))}
            </div>
            <Input value={field.value} onChange={(e) => field.onChange(e.target.value)} className="w-28 text-[13px]" placeholder="#6D28D9" />
          </div>
        )} />
      </fieldset>

      {/* Position */}
      <fieldset className="space-y-2">
        <legend className="text-[13px] font-medium">Vị trí</legend>
        <Controller control={form.control} name="position" render={({ field }) => (
          <div className="flex gap-3">
            {[{ value: "bottom-right" as const, label: "Phải dưới" }, { value: "bottom-left" as const, label: "Trái dưới" }].map((opt) => (
              <button key={opt.value} type="button" onClick={() => field.onChange(opt.value)} className={cn("rounded-lg border px-4 py-2 text-[13px] transition", field.value === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border text-text-secondary hover:border-primary/30")}>
                {opt.label}
              </button>
            ))}
          </div>
        )} />
      </fieldset>

      {/* Header text */}
      <div className="space-y-1.5">
        <label className="text-[13px] font-medium">Tiêu đề</label>
        <Input {...form.register("headerText")} className="max-w-sm text-[13px]" placeholder="Trợ lý AI" />
      </div>

      {/* Powered by toggle */}
      <Controller control={form.control} name="showPoweredBy" render={({ field }) => (
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <span className="text-[13px]">Hiển thị &quot;Powered by Smartbot&quot;</span>
          <Switch checked={field.value} onCheckedChange={field.onChange} />
        </div>
      )} />

      {/* Custom CSS */}
      <div className="space-y-1.5">
        <label className="text-[13px] font-medium">Custom CSS</label>
        <Textarea {...form.register("customCss")} rows={4} className="font-mono text-[12px]" placeholder="/* Custom CSS */" />
      </div>

      <Button type="submit" disabled={updateWidget.isPending}>
        {updateWidget.isPending ? "Đang lưu..." : "Lưu thay đổi"}
      </Button>
    </form>
  )
}
