"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ErrorState } from "@/components/shared/error-state"
import { MonacoCodeEditor } from "@/components/features/flow-canvas/config-drawer/monaco-code-editor"
import {
  useCustomToolDetail,
  useCreateCustomTool,
  useUpdateCustomTool,
} from "@/lib/hooks/use-custom-tools"

const DEFAULT_SCHEMA = `{
  "type": "object",
  "properties": {
    "query": { "type": "string", "description": "Search query" }
  },
  "required": ["query"]
}`

const DEFAULT_IMPLEMENTATION = `# Available: inputs dict with keys from schema properties
# Must assign: output = {"key": value}
result = inputs.get("query", "")
output = {"result": f"Processed: {result}"}`

export default function CustomToolEditorPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const isNew = id === "new"

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [schema, setSchema] = useState(DEFAULT_SCHEMA)
  const [implementation, setImplementation] = useState(DEFAULT_IMPLEMENTATION)

  const { data: tool, isLoading, isError, refetch } = useCustomToolDetail(isNew ? "" : id)
  const createMutation = useCreateCustomTool()
  const updateMutation = useUpdateCustomTool(id)

  useEffect(() => {
    if (tool) {
      setName(tool.name)
      setDescription(tool.description ?? "")
      setSchema(JSON.stringify(tool.schema, null, 2))
      setImplementation(tool.implementation)
    }
  }, [tool])

  async function handleSave() {
    let parsedSchema: Record<string, unknown>
    try {
      parsedSchema = JSON.parse(schema)
    } catch {
      return
    }

    const payload = { name, description: description || undefined, schema: parsedSchema, implementation }

    if (isNew) {
      createMutation.mutate(payload, {
        onSuccess: () => router.push("/custom-tools"),
      })
    } else {
      updateMutation.mutate(payload, {
        onSuccess: () => router.push("/custom-tools"),
      })
    }
  }

  if (!isNew && isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <ArrowLeft size={14} />
          <Link href="/custom-tools" className="hover:underline">Custom Tools</Link>
        </div>
        <LoadingSkeleton variant="form" />
      </div>
    )
  }

  if (!isNew && isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <ArrowLeft size={14} />
          <Link href="/custom-tools" className="hover:underline">Custom Tools</Link>
        </div>
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <ArrowLeft size={14} />
        <Link href="/custom-tools" className="hover:underline">Custom Tools</Link>
        <span>/</span>
        <span className="text-foreground">{isNew ? "Tạo mới" : (name || id)}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[16px]">
            {isNew ? "Tạo Custom Tool mới" : "Chỉnh sửa Custom Tool"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium">
              Tên <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="vd: search_web, get_weather"
              className="h-9 text-[13px]"
            />
            <p className="text-[11px] text-muted-foreground">Dùng snake_case. Tên này được dùng để gọi tool trong agent.</p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium">Mô tả</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn gọn tool làm gì…"
              className="text-[13px] min-h-[72px] resize-none"
              maxLength={2000}
            />
          </div>

          {/* Schema */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium">
              JSON Schema <span className="text-destructive">*</span>
            </Label>
            <MonacoCodeEditor
              value={schema}
              onChange={setSchema}
              language="json"
              height={180}
            />
            <p className="text-[11px] text-muted-foreground">
              JSON Schema mô tả các tham số đầu vào. Các key trong <code>properties</code> sẽ là keys của dict <code>inputs</code>.
            </p>
          </div>

          {/* Implementation */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium">
              Python Implementation <span className="text-destructive">*</span>
            </Label>
            <MonacoCodeEditor
              value={implementation}
              onChange={setImplementation}
              language="python"
              height={240}
            />
            <p className="text-[11px] text-muted-foreground">
              Code được chạy trong sandbox RestrictedPython. Đọc từ <code>inputs</code>, gán kết quả vào <code>output</code>.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => router.push("/custom-tools")} disabled={isSaving}>
              Hủy
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!name.trim() || isSaving}>
              {isSaving ? "Đang lưu…" : "Lưu"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
