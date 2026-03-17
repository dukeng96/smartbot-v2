"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown, ChevronRight } from "lucide-react"

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
  const [showAdvanced, setShowAdvanced] = useState(false)
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
        setShowAdvanced(false)
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

          <button
            type="button"
            className="flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-foreground"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            Cài đặt nâng cao
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium">Chunk Size</label>
                <Input
                  type="number"
                  placeholder="500"
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
                  placeholder="50"
                  {...register("chunkOverlap", { valueAsNumber: true })}
                />
                {errors.chunkOverlap && (
                  <p className="text-[12px] text-destructive">{errors.chunkOverlap.message}</p>
                )}
              </div>
            </div>
          )}

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
