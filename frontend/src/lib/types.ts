export type Pcap = {
  id: number
  filename: string
  uploaded_at: string
}

export type Job = {
  id: number
  status: string
  progress: number
  error?: string
}

export type Flow = {
  id: number
  proto: string
  src_ip: string
  dst_ip: string
  src_port: number
  dst_port: number
  rtt_ms?: number
  bytes_sent: number
  bytes_recv: number
  retransmits: number
  out_of_order: number
  tls_sni?: string
  tls_version?: string
  alpn?: string
  mss?: number
}

export type Issue = {
  id: number
  severity: 'HIGH' | 'MED' | 'LOW'
  type: string
  title: string
  description: string
  evidence_json: string
  created_at: string
  flow_id?: number
}
