import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { FlowSummary } from '../types/viewer'

export function useStreamSummary(jobId?: string, streamId?: number) {
  return useQuery<FlowSummary | null>({
    queryKey: ['streamSummary', jobId, streamId],
    queryFn: async ({ signal }) => {
      const flows = await api.listJobFlows(jobId!, { stream: streamId, limit: 1 }, { signal })
      return flows?.[0] ?? null
    },
    enabled: !!jobId && streamId !== undefined
  })
}
