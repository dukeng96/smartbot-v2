import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { PaginationMeta } from "@/lib/types/api-responses"

interface DataTablePaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
}

/**
 * Table pagination — "Hiển thị X / Y" + Prev/Next buttons.
 * Designed to sit below DataTable.
 */
export function DataTablePagination({ meta, onPageChange }: DataTablePaginationProps) {
  const { total, page, totalPages } = meta
  const start = total === 0 ? 0 : (page - 1) * meta.limit + 1
  const end = Math.min(page * meta.limit, total)

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3">
      <p className="text-[12px] text-text-muted tabular-nums">
        Hiển thị {start}–{end} / {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-[60px] text-center text-[12px] text-text-secondary tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Trang tiếp"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
