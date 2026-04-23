"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  createDocumentTextSchema,
  type CreateDocumentTextFormValues,
} from "@/lib/validations/document-schemas"
import { useCreateDocumentFromText } from "@/lib/hooks/use-documents"

interface DocumentTextDialogProps {
  kbId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentTextDialog({ kbId, open, onOpenChange }: DocumentTextDialogProps) {
  const createMutation = useCreateDocumentFromText(kbId)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateDocumentTextFormValues>({
    resolver: zodResolver(createDocumentTextSchema),
    defaultValues: { name: "", content: "" },
  })

  const contentValue = useWatch({ control, name: "content" })
  const charCount = contentValue?.length ?? 0

  function onSubmit(values: CreateDocumentTextFormValues) {
    createMutation.mutate(values, {
      onSuccess: () => {
        reset()
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Thêm văn bản</DialogTitle>
          <DialogDescription>
            Nhập nội dung văn bản trực tiếp làm tài liệu
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium">Tiêu đề</label>
            <Input placeholder="VD: Chính sách bảo hành" {...register("name")} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium">Nội dung *</label>
            <Textarea
              placeholder="Nhập nội dung văn bản..."
              rows={8}
              {...register("content")}
            />
            <div className="flex justify-between">
              {errors.content ? (
                <p className="text-[12px] text-destructive">{errors.content.message}</p>
              ) : (
                <span />
              )}
              <p className="text-[11px] text-text-muted tabular-nums">
                {charCount.toLocaleString("vi-VN")} / 100.000
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Đang thêm..." : "Thêm văn bản"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
