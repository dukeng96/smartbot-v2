import { z } from "zod"

export const createBotSchema = z.object({
  name: z.string().min(1, "Tên không được để trống").max(100, "Tên tối đa 100 ký tự"),
  description: z.string().max(500, "Mô tả tối đa 500 ký tự").optional(),
})

export type CreateBotInput = z.infer<typeof createBotSchema>

export const updateBotSchema = z.object({
  name: z.string().min(1, "Tên không được để trống").max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(["draft", "active", "paused"]).optional(),
  topK: z.number().int().min(1).max(20).optional(),
  memoryTurns: z.number().int().min(1).max(20).optional(),
})

export type UpdateBotInput = z.infer<typeof updateBotSchema>

export const updatePersonalitySchema = z.object({
  systemPrompt: z.string().nullable().optional(),
  greetingMessage: z.string().nullable().optional(),
  suggestedQuestions: z.array(z.string()).optional(),
  fallbackMessage: z.string().nullable().optional(),
  personality: z
    .object({
      tone: z.enum(["Professional", "Friendly", "Casual"]).nullable().optional(),
      language: z.enum(["Vietnamese", "English", "Auto-detect"]).nullable().optional(),
      restrictions: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})

export type UpdatePersonalityInput = z.infer<typeof updatePersonalitySchema>

export const updateWidgetSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  primaryColor: z.string().optional(),
  position: z.enum(["bottom-right", "bottom-left"]).optional(),
  bubbleIcon: z.string().nullable().optional(),
  showPoweredBy: z.boolean().optional(),
  customCss: z.string().nullable().optional(),
  headerText: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  fontColor: z.string().nullable().optional(),
  backgroundColor: z.string().nullable().optional(),
  userMessageColor: z.string().nullable().optional(),
  botMessageColor: z.string().nullable().optional(),
  fontFamily: z.string().nullable().optional(),
  fontSize: z.enum(["small", "medium", "large"]).nullable().optional(),
})

export type UpdateWidgetInput = z.infer<typeof updateWidgetSchema>

export const attachKbSchema = z.object({
  knowledgeBaseId: z.string().min(1, "Vui lòng chọn Knowledge Base"),
  priority: z.number().int().min(1, "Ưu tiên tối thiểu là 1"),
})

export type AttachKbInput = z.infer<typeof attachKbSchema>

export const createChannelSchema = z.object({
  type: z.enum(["web_widget", "facebook_messenger", "telegram", "zalo", "api"]),
  config: z.record(z.string(), z.unknown()).optional(),
})

export type CreateChannelInput = z.infer<typeof createChannelSchema>
