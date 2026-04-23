"use client"

import { useForm } from "react-hook-form"
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
import { createKbSchema, type CreateKbFormValues } from "@/lib/validations/kb-schemas"
import { useCreateKnowledgeBase } from "@/lib/hooks/use-knowledge-bases"

interface KbCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KbCreateDialog({ open, onOpenChange }: KbCreateDialogProps) {
  const createMutation = useCreateKnowledgeBase()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateKbFormValues>({
    resolver: zodResolver(createKbSchema),
    defaultValues: { name: "", description: "" },
  })

  function onSubmit(values: CreateKbFormValues) {
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
          <DialogTitle>Tạo Knowledge Base</DialogTitle>
          <DialogDescription>
            Tạo nguồn tri thức mới cho AI assistant
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium">Tên *</label>
            <Input placeholder="VD: FAQ sản phẩm" {...register("name")} />
            {errors.name && (
              <p className="text-[12px] text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium">Mô tả</label>
            <Textarea
              placeholder="Mô tả ngắn về knowledge base..."
              rows={3}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-[12px] text-destructive">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Đang tạo..." : "Tạo mới"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
