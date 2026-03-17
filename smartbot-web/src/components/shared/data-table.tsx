"use client"

import type { ReactNode } from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export interface DataTableColumn<T> {
  key: string
  header: string
  /** Render function — receives the row data */
  cell: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  /** Unique key extractor for each row */
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  className?: string
}

/**
 * Generic paginated data table — 12px uppercase headers, 56px rows.
 * Used by D1, D3, E1, G4, H3, C6.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <Table className={cn(className)}>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={cn(
                "h-10 text-[12px] uppercase text-text-muted font-normal tracking-wide",
                col.className,
              )}
            >
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow
            key={rowKey(row)}
            className={cn(
              "h-[56px] border-border-light text-[13px] text-text-body",
              onRowClick && "cursor-pointer hover:bg-[#F9FAFB]",
            )}
            onClick={() => onRowClick?.(row)}
          >
            {columns.map((col) => (
              <TableCell key={col.key} className={cn(col.className)}>
                {col.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
