"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

// Lazy-load Monaco to keep initial bundle small
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full" />,
  }
)

interface MonacoCodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: "python" | "json" | "javascript"
  height?: number
}

export function MonacoCodeEditor({
  value,
  onChange,
  language = "python",
  height = 200,
}: MonacoCodeEditorProps) {
  return (
    <div className="border rounded-md overflow-hidden">
      <MonacoEditor
        height={height}
        language={language}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 4,
          automaticLayout: true,
        }}
      />
    </div>
  )
}
