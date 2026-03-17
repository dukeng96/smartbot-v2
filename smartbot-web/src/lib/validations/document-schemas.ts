import { z } from "zod"

/**
 * Zod schemas for Document creation (URL + text input).
 * File upload uses multipart/form-data, no Zod needed.
 */
export const createDocumentUrlSchema = z.object({
  url: z
    .string()
    .min(1, "URL không được để trống")
    .url("URL không hợp lệ"),
})

export type CreateDocumentUrlFormValues = z.infer<typeof createDocumentUrlSchema>

export const createDocumentTextSchema = z.object({
  name: z.string().max(255, "Tên tối đa 255 ký tự").optional(),
  content: z
    .string()
    .min(1, "Nội dung không được để trống")
    .max(100000, "Nội dung tối đa 100.000 ký tự"),
})

export type CreateDocumentTextFormValues = z.infer<typeof createDocumentTextSchema>
