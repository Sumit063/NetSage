export type JobTotals = {
  total_packets: number
  total_bytes: number
  total_streams: number
  tcp_streams: number
  udp_streams: number
}

export type TimeseriesPoint = {
  ts: string
  value: number
}

export type Timeseries = {
  granularity_sec: number
  packets_per_sec: TimeseriesPoint[]
  bytes_per_sec: TimeseriesPoint[]
}

export type StreamPoint = {
  ts: string
  inbound: number
  outbound: number
  total: number
}

export type StreamTimeseries = {
  granularity_sec: number
  packets_per_sec: StreamPoint[]
  bytes_per_sec: StreamPoint[]
}

export type TopPeer = {
  ip: string
  packets: number
  bytes: number
}

export type TopConversation = {
  flow_id: number
  client_ip: string
  client_port: number
  server_ip: string
  server_port: number
  protocol: string
  packets: number
  bytes: number
  first_ts: string
  last_ts: string
  duration_ms: number
}

export type TopPort = {
  port: number
  packets: number
}

export type JobSummary = {
  top_sources: TopPeer[]
  top_destinations: TopPeer[]
  top_conversations: TopConversation[]
  protocol_counts: Record<string, number>
  top_ports: TopPort[]
  stream_counts: Record<string, number>
  app_protocols: Record<string, number>
  totals: JobTotals
  timeseries: Timeseries
}

export type Packet = {
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
  stream_id?: number
  tcp_flags: {
    SYN: boolean
    ACK: boolean
    FIN: boolean
    RST: boolean
    PSH: boolean
    URG: boolean
  }
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

export type FlowSummary = {
  id: number
  protocol: string
  client_ip: string
  client_port: number
  server_ip: string
  server_port: number
  start_ts: string
  end_ts: string
  duration_ms?: number
  handshake_rtt_ms_estimate?: number | null
  bytes_client_to_server: number
  bytes_server_to_client: number
  packet_count: number
  tcp_retransmissions: number
  dup_acks: number
}

export type Issue = {
  id: number
  issue_type: string
  severity: number
  title: string
  summary: string
  primary_flow?: FlowSummary
}
