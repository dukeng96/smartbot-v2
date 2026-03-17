import type { PaginatedResponse, ListParams } from "@/lib/types/api-responses"
import type {
  KBDocument,
  CreateDocumentUrlInput,
  CreateDocumentTextInput,
} from "@/lib/types/document"
import { apiGet, apiPost, apiPatch, apiDelete, apiClient } from "./client"
import type { ApiResponse } from "@/lib/types/api-responses"

const base = (kbId: string) => `api/v1/knowledge-bases/${kbId}/documents`

/** List documents in a KB with pagination. */
export function listDocuments(kbId: string, params?: ListParams) {
  return apiGet<PaginatedResponse<KBDocument>>(
    base(kbId),
    params as Record<string, string | number | boolean | undefined>,
  )
}

/** Get single document by ID. */
export function getDocument(kbId: string, docId: string) {
  return apiGet<KBDocument>(`${base(kbId)}/${docId}`)
}

/** Upload a file document (multipart/form-data). */
export async function uploadDocument(kbId: string, file: File) {
  const formData = new FormData()
  formData.append("file", file)
  const res = await apiClient
    .post(`${base(kbId)}/upload`, { body: formData })
    .json<ApiResponse<KBDocument>>()
  return res.data
}

/** Create document from URL. */
export function createDocumentFromUrl(kbId: string, data: CreateDocumentUrlInput) {
  return apiPost<KBDocument>(`${base(kbId)}/url`, data)
}

/** Create document from text. */
export function createDocumentFromText(kbId: string, data: CreateDocumentTextInput) {
  return apiPost<KBDocument>(`${base(kbId)}/text`, data)
}

/** Update document (toggle enabled, update metadata). */
export function updateDocument(
  kbId: string,
  docId: string,
  data: { enabled?: boolean; metadata?: Record<string, unknown> },
) {
  return apiPatch<KBDocument>(`${base(kbId)}/${docId}`, data)
}

/** Soft delete a document. */
export function deleteDocument(kbId: string, docId: string) {
  return apiDelete(`${base(kbId)}/${docId}`)
}

/** Reprocess a single document. */
export function reprocessDocument(kbId: string, docId: string) {
  return apiPost<void>(`${base(kbId)}/${docId}/reprocess`)
}
