import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Issue } from '../types/viewer'

export function useJobIssues(jobId?: string) {
  return useQuery<Issue[]>({
    queryKey: ['jobIssues', jobId],
    queryFn: () => api.listJobIssues(jobId!),
    enabled: !!jobId
  })
}
