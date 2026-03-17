/**
 * User interface — matches backend User entity shape.
 */
export interface User {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  phone: string | null
  emailVerified: boolean
  authProvider: "email" | "google"
  lastLoginAt: string | null
  createdAt: string
}
