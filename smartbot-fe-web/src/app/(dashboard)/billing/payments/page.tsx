"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Receipt } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { DataTableToolbar } from "@/components/shared/data-table-toolbar"
import { DataTablePagination } from "@/components/shared/data-table-pagination"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { PaymentHistoryTable } from "@/components/features/billing/payment-history-table"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePayments } from "@/lib/hooks/use-billing"
import { formatVnd } from "@/lib/utils/format-currency"

/**
 * G4 — Payment history page.
 * Filters + DataTable + pagination + summary footer.
 */
export default function PaymentsPage() {
  const [type, setType] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = usePayments({
    type: type || undefined,
    status: status || undefined,
    page,
    limit: 20,
  })

  const payments = data?.items ?? []
  const meta = data?.meta

  // Calculate summary stats from current data
  const totalSpent = payments
    .filter((p) => p.status === "completed" && p.type !== "refund")
    .reduce((sum, p) => sum + p.amount, 0)
  const subTotal = payments
    .filter((p) => p.type === "subscription" && p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0)
  const topUpTotal = payments
    .filter((p) => p.type === "top_up" && p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <PageHeader
        title="Lịch sử thanh toán"
        description="Xem lại các giao dịch đã thực hiện"
      />

      <DataTableToolbar
        filters={
          <>
            <TypeFilter value={type} onChange={setType} />
            <StatusFilter value={status} onChange={setStatus} />
          </>
        }
        actions={
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 size-4" />
            Xuất CSV
          </Button>
        }
      />

      {isLoading && <LoadingSkeleton variant="table" rows={8} />}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && payments.length === 0 && (
        <EmptyState
          icon={Receipt}
          title="Chưa có giao dịch"
          description="Lịch sử thanh toán sẽ hiển thị ở đây"
        />
      )}

      {!isLoading && !isError && payments.length > 0 && (
        <>
          <PaymentHistoryTable data={payments} />

          {meta && (
            <DataTablePagination meta={meta} onPageChange={setPage} />
          )}

          {/* Summary footer */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="grid grid-cols-3 gap-6 text-[13px]">
              <div>
                <p className="text-text-muted">Tổng chi tiêu</p>
                <p className="mt-0.5 text-[16px] font-bold text-foreground tabular-nums">
                  {formatVnd(totalSpent)}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Gói dịch vụ</p>
                <p className="mt-0.5 text-[16px] font-bold text-foreground tabular-nums">
                  {formatVnd(subTotal)}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Nạp credits</p>
                <p className="mt-0.5 text-[16px] font-bold text-foreground tabular-nums">
                  {formatVnd(topUpTotal)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Breadcrumb() {
  return (
    <Link
      href="/billing/subscription"
      className="inline-flex items-center gap-1.5 rounded-[8px] px-3 h-8 text-xs font-semibold text-text-secondary hover:bg-primary-light transition-all"
    >
      <ArrowLeft className="size-4" />
      Billing / Lịch sử thanh toán
    </Link>
  )
}

function TypeFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(!v || v === "all" ? "" : v)}>
      <SelectTrigger className="h-9 w-[150px] text-[13px]">
        <SelectValue placeholder="Tất cả loại" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả loại</SelectItem>
        <SelectItem value="subscription">Gói dịch vụ</SelectItem>
        <SelectItem value="top_up">Nạp thêm</SelectItem>
        <SelectItem value="refund">Hoàn tiền</SelectItem>
      </SelectContent>
    </Select>
  )
}

function StatusFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(!v || v === "all" ? "" : v)}>
      <SelectTrigger className="h-9 w-[150px] text-[13px]">
        <SelectValue placeholder="Tất cả trạng thái" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả trạng thái</SelectItem>
        <SelectItem value="completed">Hoàn tất</SelectItem>
        <SelectItem value="pending">Đang xử lý</SelectItem>
        <SelectItem value="failed">Thất bại</SelectItem>
        <SelectItem value="refunded">Hoàn tiền</SelectItem>
      </SelectContent>
    </Select>
  )
}
