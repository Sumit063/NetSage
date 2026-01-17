export type PacketFilters = {
  srcIp?: string
  dstIp?: string
  srcPort?: string
  dstPort?: string
  proto?: 'TCP' | 'UDP'
  flags?: string[]
  stream?: string
  pair?: boolean
}

const FILTER_KEYS = ['src_ip', 'dst_ip', 'src_port', 'dst_port', 'proto', 'flags', 'stream', 'pair'] as const

export function readPacketFilters(params: URLSearchParams): PacketFilters {
  const flagsRaw = params.get('flags')
  const flags = flagsRaw ? flagsRaw.split(',').map((flag) => flag.trim()).filter(Boolean) : []
  return {
    srcIp: params.get('src_ip') || undefined,
    dstIp: params.get('dst_ip') || undefined,
    srcPort: params.get('src_port') || undefined,
    dstPort: params.get('dst_port') || undefined,
    proto: (params.get('proto')?.toUpperCase() as 'TCP' | 'UDP' | undefined) || undefined,
    flags: flags.length ? flags : undefined,
    stream: params.get('stream') || undefined,
    pair: params.get('pair') === '1' || params.get('pair') === 'true'
  }
}

export function buildPacketSearchParams(
  current: URLSearchParams,
  filters: PacketFilters,
  options?: { tab?: string; offset?: number }
): URLSearchParams {
  const next = new URLSearchParams(current)
  if (options?.tab) {
    next.set('tab', options.tab)
  }
  if (options?.offset !== undefined) {
    next.set('offset', String(options.offset))
  } else {
    next.delete('offset')
  }
  setParam(next, 'src_ip', filters.srcIp)
  setParam(next, 'dst_ip', filters.dstIp)
  setParam(next, 'src_port', filters.srcPort)
  setParam(next, 'dst_port', filters.dstPort)
  setParam(next, 'proto', filters.proto)
  setParam(next, 'stream', filters.stream)
  if (filters.flags && filters.flags.length) {
    next.set('flags', filters.flags.join(','))
  } else {
    next.delete('flags')
  }
  if (filters.pair) {
    next.set('pair', '1')
  } else {
    next.delete('pair')
  }
  return next
}

export function clearPacketFilters(current: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(current)
  FILTER_KEYS.forEach((key) => next.delete(key))
  next.delete('offset')
  return next
}

export function getPacketOffset(params: URLSearchParams): number {
  const raw = params.get('offset')
  if (!raw) return 0
  const parsed = Number(raw)
  if (Number.isNaN(parsed) || parsed < 0) return 0
  return parsed
}

export function packetFiltersToQuery(filters: PacketFilters): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.srcIp) params.src_ip = filters.srcIp
  if (filters.dstIp) params.dst_ip = filters.dstIp
  if (filters.srcPort) params.src_port = filters.srcPort
  if (filters.dstPort) params.dst_port = filters.dstPort
  if (filters.proto) params.proto = filters.proto
  if (filters.stream) params.stream = filters.stream
  if (filters.flags && filters.flags.length) params.flags = filters.flags.join(',')
  if (filters.pair) params.pair = '1'
  return params
}

export function getActiveFilterPills(filters: PacketFilters): { key: keyof PacketFilters; label: string; value: string }[] {
  const pills: { key: keyof PacketFilters; label: string; value: string }[] = []
  if (filters.srcIp) pills.push({ key: 'srcIp', label: 'Src IP', value: filters.srcIp })
  if (filters.dstIp) pills.push({ key: 'dstIp', label: 'Dst IP', value: filters.dstIp })
  if (filters.srcPort) pills.push({ key: 'srcPort', label: 'Src Port', value: filters.srcPort })
  if (filters.dstPort) pills.push({ key: 'dstPort', label: 'Dst Port', value: filters.dstPort })
  if (filters.proto) pills.push({ key: 'proto', label: 'Protocol', value: filters.proto })
  if (filters.flags && filters.flags.length) pills.push({ key: 'flags', label: 'Flags', value: filters.flags.join(', ') })
  if (filters.stream) pills.push({ key: 'stream', label: 'Stream', value: filters.stream })
  return pills
}

function setParam(target: URLSearchParams, key: string, value?: string) {
  if (value) {
    target.set(key, value)
  } else {
    target.delete(key)
  }
}
