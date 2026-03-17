"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { botsApi, type BotListParams } from "@/lib/api/bots-api"
import type { UpdateBotInput, CreateBotInput, UpdatePersonalityInput, UpdateWidgetInput } from "@/lib/validations/bot-schemas"

// --- Query hooks ---

export function useBots(params?: BotListParams) {
  return useQuery({
    queryKey: ["bots", params],
    queryFn: () => botsApi.list(params),
  })
}

export function useBot(id: string) {
  return useQuery({
    queryKey: ["bots", id],
    queryFn: () => botsApi.getById(id),
    enabled: !!id,
  })
}

export function useBotEmbedCode(id: string) {
  return useQuery({
    queryKey: ["bots", id, "embed-code"],
    queryFn: () => botsApi.getEmbedCode(id),
    enabled: !!id,
  })
}

export function useBotKnowledgeBases(id: string) {
  return useQuery({
    queryKey: ["bots", id, "knowledge-bases"],
    queryFn: () => botsApi.getKnowledgeBases(id),
    enabled: !!id,
  })
}

export function useBotChannels(id: string) {
  return useQuery({
    queryKey: ["bots", id, "channels"],
    queryFn: () => botsApi.getChannels(id),
    enabled: !!id,
  })
}

// --- Mutation hooks ---

export function useCreateBot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBotInput) => botsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bots"] })
      toast.success("Tạo assistant thành công")
    },
    onError: (err: Error) => toast.error(err.message || "Đã xảy ra lỗi"),
  })
}

export function useUpdateBot(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateBotInput) => botsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bots", id] })
      qc.invalidateQueries({ queryKey: ["bots"] })
      toast.success("Lưu thành công")
    },
    onError: (err: Error) => toast.error(err.message || "Đã xảy ra lỗi"),
  })
}

export function useDeleteBot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => botsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bots"] })
      toast.success("Đã xóa assistant")
    },
    onError: (err: Error) => toast.error(err.message || "Đã xảy ra lỗi"),
  })
}

export function useDuplicateBot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => botsApi.duplicate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bots"] })
      toast.success("Nhân bản thành công")
    },
    onError: (err: Error) => toast.error(err.message || "Đã xảy ra lỗi"),
  })
}

export function useUpdatePersonality(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdatePersonalityInput) => botsApi.updatePersonality(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bots", id] })
      toast.success("Lưu thành công")
    },
    onError: (err: Error) => toast.error(err.message || "Đã xảy ra lỗi"),
  })
}

export function useUpdateWidget(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateWidgetInput) => botsApi.updateWidget(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bots", id] })
      toast.success("Lưu thành công")
    },
    onError: (err: Error) => toast.error(err.message || "Đã xảy ra lỗi"),
  })
}
