"use client"

import { useEffect } from "react"
import { AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-destructive-light">
        <AlertCircle className="size-7 text-destructive" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-foreground">
        Đã xảy ra lỗi
      </h2>
      <p className="mt-2 max-w-sm text-[13px] text-text-secondary">
        Có sự cố xảy ra. Vui lòng thử lại hoặc liên hệ hỗ trợ.
      </p>
      <Button variant="outline" className="mt-6" onClick={reset}>
        Thử lại
      </Button>
    </div>
  )
}
