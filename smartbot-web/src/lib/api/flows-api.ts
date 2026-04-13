import { apiGet, apiPatch, apiPost } from "./client"
import type { Flow, SaveFlowDto, CredentialItem, CustomToolItem, PaginatedResult } from "@/lib/types/flow"

// TODO(post-MVP): GET /api/v1/flows/node-types — fetch from Python Pydantic schema export
// For MVP, node definitions are maintained client-side in node-definitions.ts

export interface FlowValidateResult {
  ok: boolean
  errors: string[]
}

export const flowsApi = {
  getById: (id: string): Promise<Flow> =>
    apiGet(`api/v1/flows/${id}`),

  save: (id: string, body: SaveFlowDto): Promise<Flow> =>
    apiPatch(`api/v1/flows/${id}`, body),

  validate: (id: string): Promise<FlowValidateResult> =>
    apiPost(`api/v1/flows/${id}/validate`),

  getCredentials: (): Promise<CredentialItem[]> =>
    apiGet("api/v1/credentials"),

  getCustomTools: (): Promise<PaginatedResult<CustomToolItem>> =>
    apiGet("api/v1/custom-tools"),
}
