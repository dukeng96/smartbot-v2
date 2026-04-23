import { z } from "zod"

/**
 * Zod schemas for Knowledge Base create/update forms.
 * Chunk settings are fixed in backend.
 */
export const createKbSchema = z.object({
  name: z
    .string()
    .min(1, "Tên không được để trống")
    .max(255, "Tên tối đa 255 ký tự"),
  description: z.string().max(1000, "Mô tả tối đa 1000 ký tự").optional(),
})

export type CreateKbFormValues = z.infer<typeof createKbSchema>

export const updateKbSchema = z.object({
  name: z
    .string()
    .min(1, "Tên không được để trống")
    .max(255, "Tên tối đa 255 ký tự"),
  description: z.string().max(1000, "Mô tả tối đa 1000 ký tự").optional(),
})

export type UpdateKbFormValues = z.infer<typeof updateKbSchema>
