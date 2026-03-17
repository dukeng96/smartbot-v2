import { z } from "zod"

/**
 * Zod schemas for Knowledge Base create/update forms.
 * chunkSize: 100–2000 (default 500), chunkOverlap: 0–500 (default 50).
 */
export const createKbSchema = z.object({
  name: z
    .string()
    .min(1, "Tên không được để trống")
    .max(255, "Tên tối đa 255 ký tự"),
  description: z.string().max(1000, "Mô tả tối đa 1000 ký tự").optional(),
  chunkSize: z
    .number()
    .int()
    .min(100, "Tối thiểu 100")
    .max(2000, "Tối đa 2000")
    .optional(),
  chunkOverlap: z
    .number()
    .int()
    .min(0, "Tối thiểu 0")
    .max(500, "Tối đa 500")
    .optional(),
})

export type CreateKbFormValues = z.infer<typeof createKbSchema>

export const updateKbSchema = z.object({
  name: z
    .string()
    .min(1, "Tên không được để trống")
    .max(255, "Tên tối đa 255 ký tự"),
  description: z.string().max(1000, "Mô tả tối đa 1000 ký tự").optional(),
  chunkSize: z
    .number()
    .int()
    .min(100, "Tối thiểu 100")
    .max(2000, "Tối đa 2000"),
  chunkOverlap: z
    .number()
    .int()
    .min(0, "Tối thiểu 0")
    .max(500, "Tối đa 500"),
})

export type UpdateKbFormValues = z.infer<typeof updateKbSchema>
