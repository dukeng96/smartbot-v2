import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  variant?: "table" | "cards" | "detail" | "form"
  rows?: number
  className?: string
}

/**
 * Loading skeleton — matches page layout templates.
 * Variants: table (list pages), cards (C1 grid), detail (form/detail pages), form.
 */
export function LoadingSkeleton({ variant = "table", rows = 5, className }: LoadingSkeletonProps) {
  if (variant === "cards") {
    return (
      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === "detail" || variant === "form") {
    return (
      <div className={cn("space-y-6", className)}>
        <Skeleton className="h-6 w-48" />
        <div className="space-y-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
    )
  }

  // Default: table variant
  return (
    <div className={cn("space-y-0", className)}>
      {/* Table header skeleton */}
      <div className="flex items-center gap-4 border-b border-border px-4 py-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-24" />
        ))}
      </div>
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border-light px-4 py-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}
