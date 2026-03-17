"use client"

import { useEffect, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, X } from "lucide-react"

import type { Bot } from "@/lib/types/bot"
import { updatePersonalitySchema, type UpdatePersonalityInput } from "@/lib/validations/bot-schemas"
import { useUpdatePersonality } from "@/lib/hooks/use-bots"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

import { BotChatPreview } from "./bot-chat-preview"

interface BotPersonalityFormProps {
  bot: Bot
}

export function BotPersonalityForm({ bot }: BotPersonalityFormProps) {
  const updatePersonality = useUpdatePersonality(bot.id)
  const [newQuestion, setNewQuestion] = useState("")

  const form = useForm<UpdatePersonalityInput>({
    resolver: zodResolver(updatePersonalitySchema),
    defaultValues: {
      systemPrompt: bot.systemPrompt ?? "",
      greetingMessage: bot.greetingMessage ?? "",
      suggestedQuestions: bot.suggestedQuestions ?? [],
      fallbackMessage: bot.fallbackMessage ?? "",
      personality: {
        tone: bot.personality?.tone ?? null,
        language: bot.personality?.language ?? null,
        restrictions: bot.personality?.restrictions ?? "",
      },
    },
  })

  useEffect(() => {
    form.reset({
      systemPrompt: bot.systemPrompt ?? "",
      greetingMessage: bot.greetingMessage ?? "",
      suggestedQuestions: bot.suggestedQuestions ?? [],
      fallbackMessage: bot.fallbackMessage ?? "",
      personality: {
        tone: bot.personality?.tone ?? null,
        language: bot.personality?.language ?? null,
        restrictions: bot.personality?.restrictions ?? "",
      },
    })
  }, [bot, form])

  const questions = form.watch("suggestedQuestions") ?? []
  const greetingMsg = form.watch("greetingMessage") ?? ""

  const addQuestion = () => {
    const trimmed = newQuestion.trim()
    if (!trimmed) return
    form.setValue("suggestedQuestions", [...questions, trimmed])
    setNewQuestion("")
  }

  const removeQuestion = (idx: number) => {
    form.setValue("suggestedQuestions", questions.filter((_, i) => i !== idx))
  }

  const onSubmit = form.handleSubmit((data) => updatePersonality.mutate(data))

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[58fr_42fr]">
      {/* Left: Form */}
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium">System Prompt</label>
          <Textarea {...form.register("systemPrompt")} rows={8} className="text-[13px]" placeholder="Mô tả vai trò và hành vi của assistant..." />
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-medium">Lời chào</label>
          <Input {...form.register("greetingMessage")} className="text-[13px]" placeholder="Xin chào! Tôi có thể giúp gì cho bạn?" />
        </div>

        {/* Suggested questions */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium">Câu hỏi gợi ý</label>
          <div className="space-y-2">
            {questions.map((q, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="flex-1 rounded-lg border border-border px-3 py-2 text-[13px]">{q}</span>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeQuestion(idx)}>
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Thêm câu hỏi..." className="text-[13px]" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addQuestion() } }} />
            <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-medium">Tin nhắn dự phòng</label>
          <Input {...form.register("fallbackMessage")} className="text-[13px]" placeholder="Xin lỗi, tôi không hiểu câu hỏi..." />
        </div>

        {/* Personality */}
        <div className="space-y-4 rounded-xl border border-border p-4">
          <h4 className="text-[13px] font-semibold">Tính cách</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] text-text-muted">Giọng điệu</label>
              <Controller control={form.control} name="personality.tone" render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || null)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Chọn..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Professional">Professional</SelectItem>
                    <SelectItem value="Friendly">Friendly</SelectItem>
                    <SelectItem value="Casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] text-text-muted">Ngôn ngữ</label>
              <Controller control={form.control} name="personality.language" render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || null)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Chọn..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vietnamese">Vietnamese</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Auto-detect">Auto-detect</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-text-muted">Hạn chế</label>
            <Textarea {...form.register("personality.restrictions")} rows={3} className="text-[13px]" placeholder="Những chủ đề không được thảo luận..." />
          </div>
        </div>

        <Button type="submit" disabled={updatePersonality.isPending}>
          {updatePersonality.isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </form>

      {/* Right: Preview */}
      <div className="hidden lg:block">
        <BotChatPreview
          botName={bot.name}
          greeting={greetingMsg}
          suggestedQuestions={questions}
        />
      </div>
    </div>
  )
}
