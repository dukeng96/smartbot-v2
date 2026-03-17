import { z } from "zod"

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email không được để trống")
    .email("Email không hợp lệ"),
  password: z
    .string()
    .min(1, "Mật khẩu không được để trống"),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(1, "Họ tên không được để trống")
    .max(100, "Họ tên tối đa 100 ký tự"),
  email: z
    .string()
    .min(1, "Email không được để trống")
    .email("Email không hợp lệ"),
  password: z
    .string()
    .min(8, "Mật khẩu ít nhất 8 ký tự")
    .max(128, "Mật khẩu tối đa 128 ký tự"),
})

export type RegisterFormData = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email không được để trống")
    .email("Email không hợp lệ"),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Mật khẩu ít nhất 8 ký tự")
      .max(128, "Mật khẩu tối đa 128 ký tự"),
    confirmPassword: z
      .string()
      .min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  })

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới ít nhất 8 ký tự")
      .max(128, "Mật khẩu tối đa 128 ký tự"),
    confirmNewPassword: z
      .string()
      .min(1, "Vui lòng xác nhận mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmNewPassword"],
  })

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
