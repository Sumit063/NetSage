import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { StreamTimeseries } from '../types/viewer'

export function useStreamTimeseries(flowId?: number, granularity = 1) {
  return useQuery<StreamTimeseries>({
    queryKey: ['streamTimeseries', flowId, granularity],
    queryFn: ({ signal }) => api.getFlowTimeseries(String(flowId), { granularity }, { signal }),
    enabled: !!flowId
  })
}
