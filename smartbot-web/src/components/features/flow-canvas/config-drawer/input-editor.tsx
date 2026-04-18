"use client"

import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { VariablePicker } from "./variable-picker"
import { CredentialPicker } from "./credential-picker"
import { KbPicker } from "./kb-picker"
import { MessagesArrayEditor } from "./messages-array-editor"
import { MonacoCodeEditor } from "./monaco-code-editor"
import { CustomToolPicker } from "./custom-tool-picker"
import { FlowStateInitEditor } from "./flow-state-init-editor"
import type { NodeInputDefinition, MessageEntry, StateUpdate } from "@/lib/types/flow"

interface InputEditorProps {
  input: NodeInputDefinition
  value: unknown
  nodeId: string
  onChange: (value: unknown) => void
  allConfig?: Record<string, unknown>
}

export function InputEditor({ input, value, nodeId, onChange, allConfig }: InputEditorProps) {
  if (input.showWhen && allConfig) {
    const { field, value: expectedValue } = input.showWhen
    if (allConfig[field] !== expectedValue) {
      return null
    }
  }

  return (
    <div className="space-y-1">
      <Label className="text-[12px] font-medium">
        {input.label}
        {input.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>

      {input.type === "string" && (
        <VariablePicker
          value={String(value ?? "")}
          onChange={onChange}
          placeholder={input.placeholder}
        />
      )}

      {input.type === "number" && (
        <Input
          type="number"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          className="h-8 text-[13px]"
        />
      )}

      {input.type === "boolean" && (
        <div className="flex items-center gap-2">
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(v) => onChange(v)}
          />
          <span className="text-[12px] text-muted-foreground">
            {Boolean(value) ? "Bật" : "Tắt"}
          </span>
        </div>
      )}

      {input.type === "select" && input.options && (
        <Select value={String(value ?? "")} onValueChange={(v) => onChange(v)}>
          <SelectTrigger className="h-8 text-[13px]">
            <SelectValue placeholder="Chọn giá trị" />
          </SelectTrigger>
          <SelectContent>
            {input.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {input.type === "credential" && (
        <CredentialPicker
          value={String(value ?? "")}
          onChange={(v) => onChange(v)}
        />
      )}

      {input.type === "kb" && (
        <KbPicker
          value={String(value ?? "")}
          onChange={(v) => onChange(v)}
        />
      )}

      {input.type === "messages_array" && (
        <MessagesArrayEditor
          value={(value as MessageEntry[]) ?? []}
          onChange={onChange}
        />
      )}

      {input.type === "code" && (
        <MonacoCodeEditor
          value={String(value ?? "")}
          onChange={onChange}
          language="python"
        />
      )}

      {input.type === "custom_tool_list" && (
        <CustomToolPicker
          value={input.name === "tool_id" ? (value as string) ?? "" : (value as string[]) ?? []}
          onChange={onChange}
          mode={input.name === "tool_id" ? "single" : "multi"}
        />
      )}

      {input.type === "flow_state_init_editor" && (
        <FlowStateInitEditor
          value={(value as StateUpdate[]) ?? []}
          onChange={onChange}
        />
      )}

      {input.description && (
        <p className="text-[11px] text-muted-foreground">{input.description}</p>
      )}
    </div>
  )
}
