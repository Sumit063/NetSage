import { Panel } from '../Panel'
import { Packet } from '../../types/viewer'
import { usePacketDetails } from '../../hooks/usePacketDetails'
import { DetailGrid, DetailItem } from '../DetailFields'

type PacketDetailsPanelProps = {
  packet: Packet | null
  isLoading?: boolean
}

export function PacketDetailsPanel({ packet, isLoading }: PacketDetailsPanelProps) {
  const { details } = usePacketDetails(packet)
  const formatValue = (value: string | number | undefined | null) => (value === undefined || value === null || value === '' ? '—' : value)
  const formatBool = (value?: boolean) => (value === undefined ? '—' : value ? 'yes' : 'no')
  const formatFlags = (flags?: Packet['tcp_flags']) => {
    if (!flags) return '—'
    const list = ['SYN', 'ACK', 'FIN', 'RST', 'PSH', 'URG'].filter((flag) => flags[flag as keyof Packet['tcp_flags']])
    return list.length ? list.join(' ') : '—'
  }

  return (
    <Panel className="p-3 min-h-[180px]">
      <div className="text-xs font-semibold mb-2 uppercase tracking-wide text-muted-foreground">Packet Details</div>
      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading packet details…</div>
      ) : details ? (
        <div className="space-y-2 text-xs">
          <div className="font-mono text-[11px] text-muted-foreground">
            {details.src_ip}:{details.src_port} → {details.dst_ip}:{details.dst_port}
          </div>
          <DetailGrid
            className="text-xs sm:grid-cols-2"
            items={
              [
                { label: 'Timestamp', value: new Date(details.timestamp).toLocaleString() },
                { label: 'Protocol', value: formatValue(details.protocol) },
                { label: 'Length', value: formatValue(details.length) },
                { label: 'Stream', value: formatValue(details.stream_id) },
                { label: 'Info', value: formatValue(details.info), span: 2, valueClassName: 'break-all' },
                { label: 'TCP Flags', value: formatFlags(details.tcp_flags) },
                { label: 'Seq', value: formatValue(details.seq) },
                { label: 'Ack', value: formatValue(details.ack) },
                { label: 'Window', value: formatValue(details.window) },
                { label: 'TLS ClientHello', value: formatBool(details.tls_client_hello) },
                { label: 'TLS ServerHello', value: formatBool(details.tls_server_hello) },
                { label: 'TLS Alert', value: formatBool(details.tls_alert) },
                { label: 'TLS Alert Code', value: formatValue(details.tls_alert_code) },
                { label: 'Errors', value: details.error_tags?.length ? details.error_tags.join(', ') : '—', span: 2, valueClassName: 'break-all' },
                { label: 'TLS SNI', value: formatValue(details.tls_sni), span: 2, valueClassName: 'break-all' },
                { label: 'HTTP Method', value: formatValue(details.http_method) },
                { label: 'HTTP Host', value: formatValue(details.http_host), span: 2, valueClassName: 'break-all' }
              ] as DetailItem[]
            }
          />
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Select a packet to see details.</div>
      )}
    </Panel>
  )
}
