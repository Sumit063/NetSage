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
  first_seen?: string
  last_seen?: string
  syn_time?: string
  syn_ack_time?: string
  ack_time?: string
  rtt_ms?: number
  bytes_sent: number
  bytes_recv: number
  throughput_bps?: number
  retransmits: number
  out_of_order: number
  rst_count?: number
  fragment_count?: number
  tls_sni?: string
  tls_version?: string
  alpn?: string
  tls_client_hello?: boolean
  tls_server_hello?: boolean
  tls_alert?: boolean
  mss?: number
  http_method?: string
  http_host?: string
  http_time?: string
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
