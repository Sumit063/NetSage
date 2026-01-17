import { useStreamSummary } from './useStreamSummary'
import { useStreamTimeseries } from './useStreamTimeseries'

export function useStreamDetails(jobId?: string, streamId?: number) {
  const summaryQuery = useStreamSummary(jobId, streamId)
  const timeseriesQuery = useStreamTimeseries(summaryQuery.data?.id)

  return {
    summary: summaryQuery.data ?? null,
    timeseries: timeseriesQuery.data,
    isLoading: summaryQuery.isLoading || timeseriesQuery.isLoading
  }
}
