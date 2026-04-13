import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { flowsApi } from "@/lib/api/flows-api"
import type { SaveFlowDto } from "@/lib/types/flow"
import type { FlowValidateResult } from "@/lib/api/flows-api"

export function useFlow(flowId: string) {
  return useQuery({
    queryKey: ["flows", flowId],
    queryFn: () => flowsApi.getById(flowId),
    enabled: !!flowId,
    staleTime: 30_000,
  })
}

export function useSaveFlow(flowId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveFlowDto) => flowsApi.save(flowId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flows", flowId] })
      toast.success("Flow đã được lưu")
    },
    onError: () => {
      toast.error("Lưu flow thất bại. Vui lòng thử lại.")
    },
  })
}

export function useValidateFlow(flowId: string) {
  return useMutation<FlowValidateResult, Error>({
    mutationFn: () => flowsApi.validate(flowId),
  })
}

export function useCredentials() {
  return useQuery({
    queryKey: ["credentials"],
    queryFn: flowsApi.getCredentials,
    staleTime: 60_000,
  })
}

export function useCustomTools() {
  return useQuery({
    queryKey: ["custom-tools"],
    queryFn: flowsApi.getCustomTools,
    staleTime: 60_000,
    select: (res) => res.data,
  })
}
