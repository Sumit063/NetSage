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
  protocol: string
  src_ip: string
  dst_ip: string
  src_port: number
  dst_port: number
  client_ip: string
  client_port: number
  server_ip: string
  server_port: number
  start_ts?: string
  end_ts?: string
  syn_time?: string
  syn_ack_time?: string
  ack_time?: string
  handshake_rtt_ms_estimate?: number
  bytes_sent: number
  bytes_recv: number
  bytes_client_to_server: number
  bytes_server_to_client: number
  packet_count: number
  throughput_bps?: number
  tcp_retransmissions: number
  tcp_syn_retransmissions: number
  out_of_order: number
  dup_acks: number
  first_payload_ts?: string
  last_payload_ts?: string
  duration_ms?: number
  app_bytes: number
  tcp_stream?: number
  rst_count?: number
  fragment_count?: number
  tls_sni?: string
  tls_version?: string
  alpn?: string
  tls_client_hello?: boolean
  tls_server_hello?: boolean
  tls_alert?: boolean
  tls_alert_code?: number
  mss?: number
  http_method?: string
  http_host?: string
  http_time?: string
}

export type Issue = {
  id: number
  job_id?: number
  issue_type: string
  severity: number
  title: string
  summary: string
  primary_flow_id?: number
  created_at: string
}

export type JobSummary = {
  top_sources: { ip: string; packets: number; bytes: number }[]
  top_destinations: { ip: string; packets: number; bytes: number }[]
  top_conversations: {
    client_ip: string
    client_port: number
    server_ip: string
    server_port: number
    packets: number
    bytes: number
    first_ts: string
    last_ts: string
    duration_ms: number
  }[]
  protocol_counts: Record<string, number>
  top_ports: { port: number; packets: number }[]
}

export type PacketMeta = {
  index: number
  timestamp: string
  protocol: string
  src_ip: string
  dst_ip: string
  src_port: number
  dst_port: number
  length: number
  info: string
  error_tags?: string[]
  tcp_flags: { SYN: boolean; ACK: boolean; FIN: boolean; RST: boolean }
  seq: number
  ack: number
  window: number
  tls_client_hello?: boolean
  tls_server_hello?: boolean
  tls_alert?: boolean
  tls_alert_code?: number
  tls_sni?: string
  http_method?: string
  http_host?: string
}
