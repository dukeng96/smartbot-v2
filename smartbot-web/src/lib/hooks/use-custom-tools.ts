"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api/client"

export interface CustomTool {
  id: string
  name: string
  description: string | null
  schema: Record<string, unknown>
  implementation: string
  createdAt: string
  updatedAt: string
}

export interface CustomToolListMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CustomToolListResult {
  data: CustomTool[]
  meta: CustomToolListMeta
}

export interface CreateCustomToolDto {
  name: string
  description?: string
  schema: Record<string, unknown>
  implementation: string
}

export interface UpdateCustomToolDto {
  name?: string
  description?: string
  schema?: Record<string, unknown>
  implementation?: string
}

export function useCustomToolsList(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery<CustomToolListResult>({
    queryKey: ["custom-tools", params],
    queryFn: () =>
      apiGet<CustomToolListResult>("api/v1/custom-tools", {
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        search: params?.search,
      }),
    staleTime: 30_000,
  })
}

export function useCustomToolDetail(id: string) {
  return useQuery<CustomTool>({
    queryKey: ["custom-tools", id],
    queryFn: () => apiGet<CustomTool>(`api/v1/custom-tools/${id}`),
    enabled: !!id && id !== "new",
    staleTime: 30_000,
  })
}

export function useCreateCustomTool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCustomToolDto) => apiPost<CustomTool>("api/v1/custom-tools", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-tools"] })
      toast.success("Tạo Custom Tool thành công")
    },
    onError: (err: Error) => toast.error(err.message || "Đã xảy ra lỗi"),
  })
}

export function useUpdateCustomTool(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateCustomToolDto) => apiPatch<CustomTool>(`api/v1/custom-tools/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-tools"] })
      toast.success("Cập nhật Custom Tool thành công")
    },
    onError: (err: Error) => toast.error(err.message || "Đã xảy ra lỗi"),
  })
}

export function useDeleteCustomTool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`api/v1/custom-tools/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-tools"] })
      toast.success("Đã xóa Custom Tool")
    },
    onError: (err: Error) => toast.error(err.message || "Đã xảy ra lỗi"),
  })
}
