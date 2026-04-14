"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Wrench, Plus, Pencil, Trash2, MoreVertical } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCustomToolsList, useDeleteCustomTool } from "@/lib/hooks/use-custom-tools"
import type { CustomTool } from "@/lib/hooks/use-custom-tools"

export default function CustomToolsPage() {
  const router = useRouter()
  const [deleteTarget, setDeleteTarget] = useState<CustomTool | null>(null)

  const { data, isLoading, isError, refetch } = useCustomToolsList()
  const deleteMutation = useDeleteCustomTool()

  function handleDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Custom Tools" />
        <LoadingSkeleton variant="table" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Custom Tools" />
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  }

  const items = data?.data ?? []

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Custom Tools"
          actions={
            <Button onClick={() => router.push("/custom-tools/new")}>
              <Plus className="mr-1.5 size-4" />
              Tạo mới
            </Button>
          }
        />
        <EmptyState
          icon={Wrench}
          title="Chưa có Custom Tool nào"
          description="Tạo tool đầu tiên để dùng trong Agent nodes"
        >
          <Button className="mt-4" onClick={() => router.push("/custom-tools/new")}>
            <Plus className="mr-1.5 size-4" />
            Tạo Custom Tool
          </Button>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom Tools"
        description="Python tools có thể dùng trong Agent nodes"
        actions={
          <Button onClick={() => router.push("/custom-tools/new")}>
            <Plus className="mr-1.5 size-4" />
            Tạo mới
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] uppercase tracking-wide">Tên</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Mô tả</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Ngày tạo</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((tool) => (
              <TableRow
                key={tool.id}
                className="cursor-pointer h-14"
                onClick={() => router.push(`/custom-tools/${tool.id}`)}
              >
                <TableCell className="font-medium text-[13px]">{tool.name}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground max-w-[320px] truncate">
                  {tool.description ?? "—"}
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground">
                  {new Date(tool.createdAt).toLocaleDateString("vi-VN")}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}
                    >
                      <MoreVertical size={14} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/custom-tools/${tool.id}`)}>
                        <Pencil size={13} className="mr-2" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteTarget(tool)}
                      >
                        <Trash2 size={13} className="mr-2" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa Custom Tool"
        message={`Bạn có chắc muốn xóa "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
