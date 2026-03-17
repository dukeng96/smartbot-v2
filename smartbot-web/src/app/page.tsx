import { redirect } from "next/navigation"

/**
 * Root page — redirects to the dashboard.
 * Auth guard will redirect unauthenticated users to /login.
 */
export default function RootPage() {
  redirect("/login")
}
