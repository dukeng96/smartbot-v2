"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  createDocumentUrlSchema,
  type CreateDocumentUrlFormValues,
} from "@/lib/validations/document-schemas"
import { useCreateDocumentFromUrl } from "@/lib/hooks/use-documents"

interface DocumentUrlDialogProps {
  kbId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentUrlDialog({ kbId, open, onOpenChange }: DocumentUrlDialogProps) {
  const createMutation = useCreateDocumentFromUrl(kbId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDocumentUrlFormValues>({
    resolver: zodResolver(createDocumentUrlSchema),
    defaultValues: { url: "" },
  })

  function onSubmit(values: CreateDocumentUrlFormValues) {
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
          <DialogTitle>Thêm URL</DialogTitle>
          <DialogDescription>
            Nhập URL trang web để crawl nội dung thành tài liệu
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium">URL *</label>
            <Input
              placeholder="https://example.com/article"
              {...register("url")}
            />
            {errors.url && (
              <p className="text-[12px] text-destructive">{errors.url.message}</p>
            )}
            <p className="text-[12px] text-text-muted">
              Hệ thống sẽ crawl và trích xuất nội dung từ URL
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Đang thêm..." : "Thêm URL"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
