"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCredentials } from "@/lib/hooks/use-flow"

interface CredentialPickerProps {
  value: string
  onChange: (value: string) => void
}

export function CredentialPicker({ value, onChange }: CredentialPickerProps) {
  const { data: credentials, isLoading } = useCredentials()

  return (
    <Select value={value} onValueChange={(v) => { if (v) onChange(v) }} disabled={isLoading}>
      <SelectTrigger className="h-8 text-[13px]">
        <SelectValue placeholder={isLoading ? "Đang tải…" : "Chọn credential"} />
      </SelectTrigger>
      <SelectContent>
        {credentials?.map((cred) => (
          <SelectItem key={cred.id} value={cred.id} className="text-[13px]">
            <span className="font-medium">{cred.name}</span>
            <span className="ml-2 text-muted-foreground text-[11px]">{cred.credentialType}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
