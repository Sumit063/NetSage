import { AlertTriangle } from 'lucide-react'
import { Badge } from '../ui/badge'

const labelMap: Record<string, string> = {
  rst: 'RST',
  tls_alert: 'TLS Alert',
  syn_retransmission: 'SYN Retrans',
  retransmission: 'Retransmission',
  dup_ack: 'Dup ACK'
}

type PacketStatusBadgeProps = {
  tags?: string[]
}

export function PacketStatusBadge({ tags }: PacketStatusBadgeProps) {
  if (!tags || tags.length === 0) return null
  const labels = tags.map((tag) => labelMap[tag] || tag)
  const primary = labels[0] || 'Error'
  const label = labels.length > 1 ? `${primary} +${labels.length - 1}` : primary
  return (
    <Badge variant="high" title={labels.join(', ')} className="gap-1">
      <AlertTriangle size={12} />
      {label}
    </Badge>
  )
}
