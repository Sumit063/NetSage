import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Packet } from '../types/viewer'
import { PacketFilters, packetFiltersToQuery } from '../utils/filters'

type PacketResponse = {
  packets: Packet[]
  total_count: number
}

export function usePackets(jobId: string | undefined, filters: PacketFilters, offset: number, limit: number) {
  const filterKey = JSON.stringify(filters)
  return useQuery<PacketResponse>({
    queryKey: ['jobPackets', jobId, filterKey, offset, limit],
    queryFn: ({ signal }) =>
      api.listJobPackets(
        jobId!,
        {
          limit,
          offset,
          ...packetFiltersToQuery(filters)
        },
        { signal }
      ),
    enabled: !!jobId
  })
}
