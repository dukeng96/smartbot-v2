import { z } from "zod"

export const profileSchema = z.object({
  fullName: z
    .string()
    .min(1, "Họ tên không được để trống")
    .max(100, "Họ tên tối đa 100 ký tự"),
  phone: z
    .string()
    .max(20, "Số điện thoại tối đa 20 ký tự")
    .optional()
    .or(z.literal("")),
})

export type ProfileFormData = z.infer<typeof profileSchema>

export const workspaceSchema = z.object({
  name: z
    .string()
    .min(1, "Tên workspace không được để trống")
    .max(100, "Tên workspace tối đa 100 ký tự"),
})

export type WorkspaceFormData = z.infer<typeof workspaceSchema>

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .min(1, "Email không được để trống")
    .email("Email không hợp lệ"),
  role: z.enum(["admin", "member", "viewer"], {
    message: "Vui lòng chọn vai trò",
  }),
})

export type InviteMemberFormData = z.infer<typeof inviteMemberSchema>
