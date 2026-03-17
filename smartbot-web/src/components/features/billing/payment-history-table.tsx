"use client"

import { Download } from "lucide-react"

import type { PaymentRecord } from "@/lib/types/payment-history"
import { PAYMENT_TYPE_LABELS } from "@/lib/types/payment-history"
import { formatDate } from "@/lib/utils/format-date"
import { formatVnd } from "@/lib/utils/format-currency"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge, type StatusVariant } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"

interface PaymentHistoryTableProps {
  data: PaymentRecord[]
}

/** Map payment type to StatusBadge variant */
function typeVariant(t: string): StatusVariant {
  if (t === "subscription") return "subscription"
  if (t === "top_up") return "top-up"
  return "refund"
}

/** Map payment status to StatusBadge variant */
function statusVariant(s: string): StatusVariant {
  if (s === "completed") return "completed"
  if (s === "pending") return "pending"
  if (s === "failed") return "failed"
  return "refunded"
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Đang xử lý",
  completed: "Hoàn tất",
  failed: "Thất bại",
  refunded: "Hoàn tiền",
}

/**
 * Payment history data table for G4 page.
 * Columns: Date, Description, Type, Amount, Status, Method, Invoice.
 */
export function PaymentHistoryTable({ data }: PaymentHistoryTableProps) {
  const columns: DataTableColumn<PaymentRecord>[] = [
    {
      key: "date",
      header: "Ngày",
      cell: (row) => (
        <span className="tabular-nums">{formatDate(row.createdAt)}</span>
      ),
      className: "w-[110px]",
    },
    {
      key: "description",
      header: "Mô tả",
      cell: (row) => (
        <span className="truncate">{row.description}</span>
      ),
    },
    {
      key: "type",
      header: "Loại",
      cell: (row) => (
        <StatusBadge
          status={typeVariant(row.type)}
          label={PAYMENT_TYPE_LABELS[row.type]}
        />
      ),
      className: "w-[120px]",
    },
    {
      key: "amount",
      header: "Số tiền",
      cell: (row) => {
        const isRefund = row.type === "refund"
        return (
          <span
            className={`tabular-nums font-medium ${
              isRefund ? "text-[#DC2626]" : "text-foreground"
            }`}
          >
            {isRefund ? "-" : ""}
            {formatVnd(Math.abs(row.amount))}
          </span>
        )
      },
      className: "w-[130px]",
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (row) => (
        <StatusBadge
          status={statusVariant(row.status)}
          label={STATUS_LABELS[row.status] ?? row.status}
        />
      ),
      className: "w-[120px]",
    },
    {
      key: "method",
      header: "Phương thức",
      cell: (row) => (
        <span className="text-text-secondary">
          {row.paymentMethod ?? "—"}
        </span>
      ),
      className: "w-[110px]",
    },
    {
      key: "invoice",
      header: "",
      cell: () => (
        <Button variant="ghost" size="icon-sm" aria-label="Tải hóa đơn">
          <Download className="size-4" />
        </Button>
      ),
      className: "w-[48px]",
    },
  ]

  return (
    <DataTable columns={columns} data={data} rowKey={(r) => r.id} />
  )
}
