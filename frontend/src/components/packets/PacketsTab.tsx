import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PacketFiltersPanel } from './PacketFiltersPanel'
import { ActiveFiltersBar } from './ActiveFiltersBar'
import { StreamSummaryPanel } from './StreamSummaryPanel'
import { PacketsTableContainer } from './PacketsTableContainer'
import { PacketDetailsPanel } from './PacketDetailsPanel'
import { Panel } from '../Panel'
import { Packet } from '../../types/viewer'
import { PacketFilters, buildPacketSearchParams, clearPacketFilters, getPacketOffset, readPacketFilters } from '../../utils/filters'
import { usePackets } from '../../hooks/usePackets'
import { useStreamDetails } from '../../hooks/useStreamDetails'

type PacketsTabProps = {
  jobId: string
  searchParams: URLSearchParams
  setSearchParams: (params: URLSearchParams) => void
}

const PAGE_SIZE = 200

export function PacketsTab({ jobId, searchParams, setSearchParams }: PacketsTabProps) {
  const filters = useMemo(() => readPacketFilters(searchParams), [searchParams])
  const offset = getPacketOffset(searchParams)
  const [draft, setDraft] = useState<PacketFilters>(filters)
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null)
  const detailsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setDraft(filters)
  }, [filters])

  useEffect(() => {
    setSelectedPacket(null)
  }, [filters, offset])

  useEffect(() => {
    if (selectedPacket && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedPacket])

  const { data, isLoading } = usePackets(jobId, filters, offset, PAGE_SIZE)
  const packets = data?.packets || []
  const totalCount = data?.total_count ?? 0
  const baseTs = packets[0]?.timestamp

  const streamFromFilterRaw = filters.stream !== undefined ? Number(filters.stream) : undefined
  const streamFromFilter =
    streamFromFilterRaw !== undefined && !Number.isNaN(streamFromFilterRaw) ? streamFromFilterRaw : undefined
  const uniqueStreamId = useMemo(() => {
    const ids = new Set<number>()
    packets.forEach((packet) => {
      if (typeof packet.stream_id === 'number') {
        ids.add(packet.stream_id)
      }
    })
    return ids.size === 1 ? Array.from(ids)[0] : undefined
  }, [packets])
  const activeStreamId = streamFromFilter !== undefined ? streamFromFilter : uniqueStreamId

  const { summary: streamSummary, timeseries: streamTimeseries, isLoading: streamLoading } = useStreamDetails(jobId, activeStreamId)

  const applyFilters = useCallback(() => {
    const next = { ...draft }
    if (next.proto !== 'TCP') {
      next.flags = undefined
    }
    const params = buildPacketSearchParams(searchParams, next, { tab: 'packets', offset: 0 })
    setSearchParams(params)
  }, [draft, searchParams, setSearchParams])

  const resetFilters = useCallback(() => {
    const params = clearPacketFilters(searchParams)
    params.set('tab', 'packets')
    setSearchParams(params)
  }, [searchParams, setSearchParams])

  const removeFilter = useCallback((key: keyof PacketFilters) => {
    const next = { ...filters }
    if (key === 'flags') {
      delete next.flags
    } else if (key === 'pair') {
      delete next.pair
    } else {
      delete next[key]
    }
    const params = buildPacketSearchParams(searchParams, next, { tab: 'packets', offset: 0 })
    setSearchParams(params)
  }, [filters, searchParams, setSearchParams])

  const canPrev = offset > 0
  const canNext = offset + packets.length < totalCount
  const showingStart = totalCount > 0 ? offset + 1 : 0
  const showingEnd = offset + packets.length
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 0
  const currentPage = totalCount > 0 ? Math.floor(offset / PAGE_SIZE) + 1 : 0

  const handlePrev = useCallback(() => {
    const nextOffset = Math.max(0, offset - PAGE_SIZE)
    const params = buildPacketSearchParams(searchParams, filters, { tab: 'packets', offset: nextOffset })
    setSearchParams(params)
  }, [filters, offset, searchParams, setSearchParams])

  const handleNext = useCallback(() => {
    const nextOffset = offset + PAGE_SIZE
    const params = buildPacketSearchParams(searchParams, filters, { tab: 'packets', offset: nextOffset })
    setSearchParams(params)
  }, [filters, offset, searchParams, setSearchParams])

  const applyQuickFilters = useCallback((nextFilters: Partial<PacketFilters>, replace = false) => {
    const base = replace ? {} : filters
    const params = buildPacketSearchParams(searchParams, { ...base, ...nextFilters }, { tab: 'packets', offset: 0 })
    setSearchParams(params)
  }, [filters, searchParams, setSearchParams])

  const handleSelectPacket = useCallback((packet: Packet) => {
    setSelectedPacket(packet)
  }, [])

  const handleSelectStream = useCallback(
    (streamId: number) => applyQuickFilters({ stream: String(streamId) }, true),
    [applyQuickFilters]
  )

  const handleFilterSrc = useCallback((ip: string) => applyQuickFilters({ srcIp: ip }), [applyQuickFilters])
  const handleFilterDst = useCallback((ip: string) => applyQuickFilters({ dstIp: ip }), [applyQuickFilters])

  return (
    <div className="flex flex-col gap-3">
      <Panel className="p-3 space-y-2 shrink-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Packet Filters</div>
        <PacketFiltersPanel draft={draft} onChange={setDraft} onApply={applyFilters} onReset={resetFilters} />
        <ActiveFiltersBar filters={filters} onRemove={removeFilter} onClear={resetFilters} />
      </Panel>

      <div className="flex flex-col gap-3">
        <div className="h-[50vh] min-h-[320px] shrink-0">
          <PacketsTableContainer
            packets={packets}
            isLoading={isLoading}
            baseTs={baseTs}
            totalCount={totalCount}
            currentPage={currentPage}
            totalPages={totalPages}
            showingStart={showingStart}
            showingEnd={showingEnd}
            canPrev={canPrev}
            canNext={canNext}
            onPrev={handlePrev}
            onNext={handleNext}
            onSelectPacket={handleSelectPacket}
            onSelectStream={handleSelectStream}
            onFilterSrc={handleFilterSrc}
            onFilterDst={handleFilterDst}
          />
        </div>

        <Panel className="p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Selection</div>
          <div className="space-y-3">
            {activeStreamId !== undefined ? (
              <StreamSummaryPanel
                streamNumber={activeStreamId}
                summary={streamSummary || undefined}
                timeseries={streamTimeseries}
                isLoading={streamLoading}
              />
            ) : (
              <div className="text-xs text-muted-foreground">Select a stream (or apply a stream filter) to see stream details.</div>
            )}
            <div ref={detailsRef}>
              <PacketDetailsPanel packet={selectedPacket} />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
