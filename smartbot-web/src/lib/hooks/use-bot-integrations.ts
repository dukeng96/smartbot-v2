"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { botsApi } from "@/lib/api/bots-api"

// --- API Key ---

export function useGenerateApiKey(botId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => botsApi.generateApiKey(botId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bots", botId] })
      toast.success("Tạo API key thành công")
    },
    onError: (err: Error) => toast.error(err.message || "Đã xảy ra lỗi"),
  })
}

export function useRevokeApiKey(botId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => botsApi.revokeApiKey(botId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bots", botId] })
      toast.success("Đã thu hồi API key")
    },
    onError: (err: Error) => toast.error(err.message || "Đã xảy ra lỗi"),
  })
}

// --- Knowledge Bases ---

export function useAttachKb(botId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { knowledgeBaseId: string; priority: number }) =>
      botsApi.attachKb(botId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bots", botId, "knowledge-bases"] })
      qc.invalidateQueries({ queryKey: ["bots", botId] })
      toast.success("Đã gắn Knowledge Base")
    },
    onError: (err: Error) => toast.error(err.message || "Đã xảy ra lỗi"),
  })
}

export function useDetachKb(botId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (kbId: string) => botsApi.detachKb(botId, kbId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bots", botId, "knowledge-bases"] })
      qc.invalidateQueries({ queryKey: ["bots", botId] })
      toast.success("Đã gỡ Knowledge Base")
    },
    onError: (err: Error) => toast.error(err.message || "Đã xảy ra lỗi"),
  })
}

// --- Channels ---

export function useCreateChannel(botId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { type: string; config?: Record<string, unknown> }) =>
      botsApi.createChannel(botId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bots", botId, "channels"] })
      toast.success("Kết nối kênh thành công")
    },
    onError: (err: Error) => toast.error(err.message || "Đã xảy ra lỗi"),
  })
}

export function useDeleteChannel(botId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (channelId: string) => botsApi.deleteChannel(botId, channelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bots", botId, "channels"] })
      toast.success("Đã ngắt kết nối kênh")
    },
    onError: (err: Error) => toast.error(err.message || "Đã xảy ra lỗi"),
  })
}
