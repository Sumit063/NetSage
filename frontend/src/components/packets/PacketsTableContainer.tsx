import { useCallback, useEffect, useState, memo } from 'react'
import { Panel } from '../Panel'
import { Button } from '../ui/button'
import { Packet } from '../../types/viewer'
import { PacketsTable } from './PacketsTable'

type PacketsTableContainerProps = {
  packets: Packet[]
  isLoading: boolean
  baseTs?: string
  totalCount: number
  currentPage: number
  totalPages: number
  showingStart: number
  showingEnd: number
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  onSelectPacket: (packet: Packet) => void
  onSelectStream: (streamId: number) => void
  onFilterSrc: (ip: string) => void
  onFilterDst: (ip: string) => void
}

export const PacketsTableContainer = memo(function PacketsTableContainer({
  packets,
  isLoading,
  baseTs,
  totalCount,
  currentPage,
  totalPages,
  showingStart,
  showingEnd,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onSelectPacket,
  onSelectStream,
  onFilterSrc,
  onFilterDst
}: PacketsTableContainerProps) {
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null)

  useEffect(() => {
    setSelectedPacket(null)
  }, [packets])

  const handleSelectPacket = useCallback((packet: Packet) => {
    setSelectedPacket(packet)
    onSelectPacket(packet)
  }, [onSelectPacket])

  return (
    <Panel className="p-3 flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="text-sm font-semibold text-foreground">Packets</div>
        <div>
          Total {totalCount} · Page {currentPage} of {totalPages} · Showing {showingStart}-{showingEnd}
        </div>
      </div>

      <div className="mt-2 flex-1 min-h-0">
        <PacketsTable
          packets={packets}
          isLoading={isLoading}
          baseTs={baseTs}
          selected={selectedPacket}
          onSelectPacket={handleSelectPacket}
          onSelectStream={onSelectStream}
          onFilterSrc={onFilterSrc}
          onFilterDst={onFilterDst}
        />
      </div>

      <div className="mt-2 flex items-center gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={!canPrev}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={!canNext}>
          Next
        </Button>
      </div>
    </Panel>
  )
})
