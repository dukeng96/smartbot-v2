"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { ListParams } from "@/lib/types/api-responses"
import type { CreateKnowledgeBaseInput, UpdateKnowledgeBaseInput } from "@/lib/types/knowledge-base"
import {
  listKnowledgeBases,
  getKnowledgeBase,
  createKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  reprocessAllDocuments,
} from "@/lib/api/knowledge-bases-api"

const KEYS = {
  all: ["knowledge-bases"] as const,
  list: (params?: ListParams) => [...KEYS.all, "list", params] as const,
  detail: (id: string) => [...KEYS.all, "detail", id] as const,
}

export function useKnowledgeBases(params?: ListParams) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => listKnowledgeBases(params),
  })
}

export function useKnowledgeBase(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => getKnowledgeBase(id),
    enabled: !!id,
  })
}

export function useCreateKnowledgeBase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateKnowledgeBaseInput) => createKnowledgeBase(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
      toast.success("Tạo Knowledge Base thành công")
    },
    onError: () => toast.error("Không thể tạo Knowledge Base"),
  })
}

export function useUpdateKnowledgeBase(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateKnowledgeBaseInput) => updateKnowledgeBase(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
      toast.success("Cập nhật thành công")
    },
    onError: () => toast.error("Không thể cập nhật Knowledge Base"),
  })
}

export function useDeleteKnowledgeBase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteKnowledgeBase(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
      toast.success("Đã xóa Knowledge Base")
    },
    onError: () => toast.error("Không thể xóa Knowledge Base"),
  })
}

export function useReprocessAllDocuments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reprocessAllDocuments(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
      toast.success("Đã bắt đầu reprocess tất cả tài liệu")
    },
    onError: () => toast.error("Không thể reprocess tài liệu"),
  })
}
