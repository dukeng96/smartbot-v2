"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { MoreVertical } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { updateKbSchema, type UpdateKbFormValues } from "@/lib/validations/kb-schemas"
import { useUpdateKnowledgeBase, useReprocessAllDocuments } from "@/lib/hooks/use-knowledge-bases"
import type { KnowledgeBase } from "@/lib/types/knowledge-base"

interface KbDetailFormProps {
  kb: KnowledgeBase
  onDelete: () => void
}

export function KbDetailForm({ kb, onDelete }: KbDetailFormProps) {
  const [showReprocessConfirm, setShowReprocessConfirm] = useState(false)
  const updateMutation = useUpdateKnowledgeBase(kb.id)
  const reprocessMutation = useReprocessAllDocuments()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateKbFormValues>({
    resolver: zodResolver(updateKbSchema),
    defaultValues: {
      name: kb.name,
      description: kb.description ?? "",
      chunkSize: kb.chunkSize,
      chunkOverlap: kb.chunkOverlap,
    },
  })

  useEffect(() => {
    reset({
      name: kb.name,
      description: kb.description ?? "",
      chunkSize: kb.chunkSize,
      chunkOverlap: kb.chunkOverlap,
    })
  }, [kb, reset])

  function onSubmit(values: UpdateKbFormValues) {
    updateMutation.mutate(values)
  }

  return (
    <div className="space-y-6">
      {/* Editable form */}
      <Card>
        <CardHeader>
          <CardTitle>Cài đặt</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium">Tên *</label>
              <Input {...register("name")} />
              {errors.name && (
                <p className="text-[12px] text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium">Mô tả</label>
              <Textarea rows={3} {...register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium">Chunk Size</label>
                <Input
                  type="number"
                  {...register("chunkSize", { valueAsNumber: true })}
                />
                {errors.chunkSize && (
                  <p className="text-[12px] text-destructive">{errors.chunkSize.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium">Chunk Overlap</label>
                <Input
                  type="number"
                  {...register("chunkOverlap", { valueAsNumber: true })}
                />
                {errors.chunkOverlap && (
                  <p className="text-[12px] text-destructive">{errors.chunkOverlap.message}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
                {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
              <Button type="button" variant="destructive" onClick={onDelete}>
                Xóa KB
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" />}>
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowReprocessConfirm(true)}>
                    Reprocess tất cả tài liệu
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Read-only stats */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-[13px]">
            <div>
              <p className="text-text-muted">Tổng tài liệu</p>
              <p className="font-medium">{kb.totalDocuments.toLocaleString("vi-VN")}</p>
            </div>
            <div>
              <p className="text-text-muted">Tổng ký tự</p>
              <p className="font-medium">{kb.totalChars.toLocaleString("vi-VN")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showReprocessConfirm}
        onOpenChange={setShowReprocessConfirm}
        title="Reprocess tất cả tài liệu?"
        message="Việc này sẽ trích xuất và vector hóa lại toàn bộ tài liệu. Thường chỉ cần thực hiện khi thay đổi Chunk Size hoặc Chunk Overlap."
        confirmLabel="Reprocess"
        onConfirm={() => {
          reprocessMutation.mutate(kb.id)
          setShowReprocessConfirm(false)
        }}
        loading={reprocessMutation.isPending}
      />
    </div>
  )
}
