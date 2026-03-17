"use client"

import { useState } from "react"
import { Key, AlertTriangle } from "lucide-react"

import type { Bot } from "@/lib/types/bot"
import { useGenerateApiKey, useRevokeApiKey } from "@/lib/hooks/use-bot-integrations"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/shared/copy-button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface BotApiKeySectionProps {
  bot: Bot
}

export function BotApiKeySection({ bot }: BotApiKeySectionProps) {
  const generateKey = useGenerateApiKey(bot.id)
  const revokeKey = useRevokeApiKey(bot.id)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [showRevoke, setShowRevoke] = useState(false)

  const hasKey = !!bot.apiKeyPrefix

  const handleGenerate = async () => {
    const result = await generateKey.mutateAsync()
    setNewKey(result.apiKey)
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Key className="size-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-[14px] font-semibold text-foreground">API Key</h3>
            {hasKey ? (
              <div className="mt-2 flex items-center gap-3">
                <code className="rounded-lg bg-muted px-3 py-1.5 font-mono text-[13px] text-foreground">
                  {bot.apiKeyPrefix}...
                </code>
                <Button variant="destructive" size="sm" onClick={() => setShowRevoke(true)}>
                  Thu hồi
                </Button>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-[13px] text-text-secondary">Chưa tạo API Key</p>
                <Button className="mt-3" size="sm" onClick={handleGenerate} disabled={generateKey.isPending}>
                  {generateKey.isPending ? "Đang tạo..." : "Tạo API Key"}
                </Button>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 text-[12px] text-[#D97706]">
              <AlertTriangle className="size-3.5" />
              <span>API key chỉ hiển thị một lần khi tạo</span>
            </div>
          </div>
        </div>
      </div>

      {/* New key dialog */}
      <Dialog open={!!newKey} onOpenChange={() => setNewKey(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>API Key đã tạo</DialogTitle>
            <DialogDescription>Sao chép và lưu trữ key này an toàn. Bạn sẽ không thể xem lại.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
            <code className="flex-1 break-all font-mono text-[13px]">{newKey}</code>
            <CopyButton text={newKey ?? ""} />
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKey(null)}>Đã lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirm */}
      <ConfirmDialog
        open={showRevoke}
        onOpenChange={setShowRevoke}
        title="Thu hồi API Key"
        message="API key hiện tại sẽ bị vô hiệu hóa. Các ứng dụng đang sử dụng key này sẽ ngừng hoạt động."
        confirmLabel="Thu hồi"
        onConfirm={() => { revokeKey.mutate(); setShowRevoke(false) }}
        loading={revokeKey.isPending}
      />
    </>
  )
}
