"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { ListParams } from "@/lib/types/api-responses"
import type { CreateDocumentUrlInput, CreateDocumentTextInput } from "@/lib/types/document"
import {
  listDocuments,
  getDocument,
  uploadDocument,
  createDocumentFromUrl,
  createDocumentFromText,
  updateDocument,
  deleteDocument,
  reprocessDocument,
} from "@/lib/api/documents-api"

const KEYS = {
  all: (kbId: string) => ["documents", kbId] as const,
  list: (kbId: string, params?: ListParams) => [...KEYS.all(kbId), "list", params] as const,
  detail: (kbId: string, docId: string) => [...KEYS.all(kbId), "detail", docId] as const,
}

export function useDocuments(kbId: string, params?: ListParams) {
  return useQuery({
    queryKey: KEYS.list(kbId, params),
    queryFn: () => listDocuments(kbId, params),
    enabled: !!kbId,
  })
}

export function useDocument(kbId: string, docId: string) {
  return useQuery({
    queryKey: KEYS.detail(kbId, docId),
    queryFn: () => getDocument(kbId, docId),
    enabled: !!kbId && !!docId,
  })
}

export function useUploadDocument(kbId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadDocument(kbId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all(kbId) })
      toast.success("Upload tệp thành công")
    },
    onError: () => toast.error("Không thể upload tệp"),
  })
}

export function useCreateDocumentFromUrl(kbId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDocumentUrlInput) => createDocumentFromUrl(kbId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all(kbId) })
      toast.success("Thêm URL thành công")
    },
    onError: () => toast.error("Không thể thêm URL"),
  })
}

export function useCreateDocumentFromText(kbId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDocumentTextInput) => createDocumentFromText(kbId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all(kbId) })
      toast.success("Thêm văn bản thành công")
    },
    onError: () => toast.error("Không thể thêm văn bản"),
  })
}

export function useToggleDocument(kbId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ docId, enabled }: { docId: string; enabled: boolean }) =>
      updateDocument(kbId, docId, { enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all(kbId) })
    },
    onError: () => toast.error("Không thể cập nhật trạng thái"),
  })
}

export function useDeleteDocument(kbId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (docId: string) => deleteDocument(kbId, docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all(kbId) })
      toast.success("Đã xóa tài liệu")
    },
    onError: () => toast.error("Không thể xóa tài liệu"),
  })
}

export function useReprocessDocument(kbId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (docId: string) => reprocessDocument(kbId, docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all(kbId) })
      toast.success("Đã bắt đầu reprocess tài liệu")
    },
    onError: () => toast.error("Không thể reprocess tài liệu"),
  })
}
