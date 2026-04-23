import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"

import { AuthProvider } from "@/lib/providers/auth-provider"
import { QueryProvider } from "@/lib/providers/query-provider"

import "./globals.css"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
})

export const metadata: Metadata = {
  title: {
    default: "Smartbot",
    template: "%s | Smartbot",
  },
  description: "Nền tảng AI Assistant cho doanh nghiệp",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased">
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster position="top-right" richColors closeButton />
        </QueryProvider>
      </body>
    </html>
  )
}
