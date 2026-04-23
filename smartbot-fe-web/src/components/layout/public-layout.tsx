import type { ReactNode } from "react"

interface PublicLayoutProps {
  children: ReactNode
}

/**
 * Auth page layout — centered card on gray background.
 * Used by login, register, forgot/reset password, verify email.
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Logo + tagline */}
      <div className="mb-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary">
          <span className="text-lg font-bold text-primary-foreground">S</span>
        </div>
        <h1 className="mt-3 text-xl font-semibold text-foreground">Smartbot</h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          Nền tảng AI Assistant cho doanh nghiệp
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-[420px] rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        {children}
      </div>
    </div>
  )
}
