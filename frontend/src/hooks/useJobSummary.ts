import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { JobSummary } from '../types/viewer'

export function useJobSummary(jobId?: string) {
  return useQuery<JobSummary>({
    queryKey: ['jobSummary', jobId],
    queryFn: () => api.getJobSummary(jobId!),
    enabled: !!jobId
  })
}
