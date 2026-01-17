import { useMemo, useState } from 'react'
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react'
import { Packet } from '../../types/viewer'
import { Skeleton } from '../ui/skeleton'
import { formatRelativeTime } from '../../utils/format'
import { cn } from '../../lib/utils'
import { ClickableCell } from './ClickableCell'
import { DataTable, DataTableColumn } from '../DataTable'
import { PacketStatusBadge } from './PacketStatusBadge'

type PacketsTableProps = {
  packets: Packet[]
  isLoading: boolean
  baseTs?: string
  selected?: Packet | null
  onSelectPacket: (packet: Packet) => void
  onSelectStream: (streamId: number) => void
  onFilterSrc: (ip: string) => void
  onFilterDst: (ip: string) => void
}

type SortKey = 'index' | 'length' | 'stream'

export function PacketsTable({
  packets,
  isLoading,
  baseTs,
  selected,
  onSelectPacket,
  onSelectStream,
  onFilterSrc,
  onFilterDst
}: PacketsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('index')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sortedPackets = useMemo(() => {
    if (!packets.length) return []
    const next = [...packets]
    next.sort((a, b) => {
      const aVal =
        sortKey === 'stream'
          ? typeof a.stream_id === 'number'
            ? a.stream_id
            : Number.POSITIVE_INFINITY
          : (a as any)[sortKey]
      const bVal =
        sortKey === 'stream'
          ? typeof b.stream_id === 'number'
            ? b.stream_id
            : Number.POSITIVE_INFINITY
          : (b as any)[sortKey]
      if (aVal === bVal) return 0
      return sortDir === 'asc' ? (aVal < bVal ? -1 : 1) : aVal < bVal ? 1 : -1
    })
    return next
  }, [packets, sortDir, sortKey])

  const sortIcon = (active: boolean) => {
    if (!active) return <ArrowUpDown size={12} />
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  const toggleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextKey)
    setSortDir('asc')
  }

  const columns = useMemo<DataTableColumn<Packet>[]>(
    () => [
      {
        key: 'index',
        header: (
          <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('index')}>
            No. {sortIcon(sortKey === 'index')}
          </button>
        ),
        headerClassName: 'px-3 py-2 text-right w-[72px]',
        cellClassName: 'px-3 py-2 text-right font-mono w-[72px]',
        cell: (packet) => packet.index
      },
      {
        key: 'time',
        header: 'Time',
        headerClassName: 'px-3 py-2 text-center w-[96px]',
        cellClassName: 'px-3 py-2 text-center w-[96px]',
        cell: (packet) => formatRelativeTime(packet.timestamp, baseTs)
      },
      {
        key: 'src',
        header: 'Source',
        headerClassName: 'px-3 py-2 w-[240px]',
        cellClassName: 'px-3 py-2 w-[240px]',
        cell: (packet) => (
          <ClickableCell ariaLabel={`Filter source IP ${packet.src_ip}`} onClick={() => onFilterSrc(packet.src_ip)}>
            <span className="font-mono">
              {packet.src_ip}:{packet.src_port}
            </span>
          </ClickableCell>
        )
      },
      {
        key: 'dst',
        header: 'Destination',
        headerClassName: 'px-3 py-2 w-[240px]',
        cellClassName: 'px-3 py-2 w-[240px]',
        cell: (packet) => (
          <ClickableCell ariaLabel={`Filter destination IP ${packet.dst_ip}`} onClick={() => onFilterDst(packet.dst_ip)}>
            <span className="font-mono">
              {packet.dst_ip}:{packet.dst_port}
            </span>
          </ClickableCell>
        )
      },
      {
        key: 'proto',
        header: 'Proto',
        headerClassName: 'px-3 py-2 text-center w-[72px]',
        cellClassName: 'px-3 py-2 text-center w-[72px]',
        cell: (packet) => packet.protocol
      },
      {
        key: 'length',
        header: (
          <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('length')}>
            Len {sortIcon(sortKey === 'length')}
          </button>
        ),
        headerClassName: 'px-3 py-2 text-right w-[84px]',
        cellClassName: 'px-3 py-2 text-right font-mono w-[84px]',
        cell: (packet) => packet.length
      },
      {
        key: 'stream',
        header: (
          <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('stream')}>
            Stream # {sortIcon(sortKey === 'stream')}
          </button>
        ),
        headerClassName: 'px-3 py-2 text-right w-[96px]',
        cellClassName: 'px-3 py-2 text-right w-[96px]',
        cell: (packet) =>
          typeof packet.stream_id === 'number' ? (
            <ClickableCell ariaLabel={`Filter stream ${packet.stream_id}`} onClick={() => onSelectStream(packet.stream_id!)} className="px-2">
              {packet.stream_id}
            </ClickableCell>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
      },
      {
        key: 'info',
        header: 'Info',
        headerClassName: 'px-3 py-2',
        cellClassName: 'px-3 py-2',
        cell: (packet) => (
          <div className="flex items-center gap-2">
            <PacketStatusBadge tags={packet.error_tags} />
            <div className="text-[11px] text-foreground/80 truncate max-w-[760px]" title={packet.info}>
              {packet.info}
            </div>
          </div>
        )
      }
    ],
    [baseTs, onFilterDst, onFilterSrc, onSelectStream, sortDir, sortKey]
  )

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  return (
    <DataTable
      data={sortedPackets}
      columns={columns}
      emptyLabel="No packets available."
      rowKey={(packet) => packet.index}
      onRowClick={(packet) => onSelectPacket(packet)}
      rowClassName={(packet) =>
        cn(
          packet.error_tags?.length && 'bg-red-500/5',
          selected?.index === packet.index && 'bg-secondary/30'
        )
      }
      tableClassName="table-fixed w-full min-w-[1100px] text-[11px]"
      containerClassName="h-full overflow-auto"
    />
  )
}
