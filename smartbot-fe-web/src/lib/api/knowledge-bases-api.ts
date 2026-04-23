import type { PaginatedResponse, ListParams } from "@/lib/types/api-responses"
import type {
  KnowledgeBase,
  CreateKnowledgeBaseInput,
  UpdateKnowledgeBaseInput,
} from "@/lib/types/knowledge-base"
import { apiGet, apiPost, apiPatch, apiDelete } from "./client"

const BASE = "api/v1/knowledge-bases"

/** List knowledge bases with pagination + search. */
export function listKnowledgeBases(params?: ListParams) {
  return apiGet<PaginatedResponse<KnowledgeBase>>(
    BASE,
    params as Record<string, string | number | boolean | undefined>,
  )
}

/** Get single knowledge base by ID. */
export function getKnowledgeBase(id: string) {
  return apiGet<KnowledgeBase>(`${BASE}/${id}`)
}

/** Create a new knowledge base. */
export function createKnowledgeBase(data: CreateKnowledgeBaseInput) {
  return apiPost<KnowledgeBase>(BASE, data)
}

/** Update a knowledge base. */
export function updateKnowledgeBase(id: string, data: UpdateKnowledgeBaseInput) {
  return apiPatch<KnowledgeBase>(`${BASE}/${id}`, data)
}

/** Soft delete a knowledge base. */
export function deleteKnowledgeBase(id: string) {
  return apiDelete(`${BASE}/${id}`)
}

/** Reprocess all documents in a knowledge base. */
export function reprocessAllDocuments(id: string) {
  return apiPost<void>(`${BASE}/${id}/reprocess-all`)
}
