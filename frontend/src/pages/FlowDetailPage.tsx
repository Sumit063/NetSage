import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Page } from '../components/Page'
import { Panel } from '../components/Panel'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { AnimatedDialog } from '../components/AnimatedDialog'
import { Skeleton } from '../components/ui/skeleton'
import { DetailGrid, DetailList, DetailItem } from '../components/DetailFields'

function formatTime(value?: string) {
  if (!value) return 'n/a'
  const ts = new Date(value)
  if (Number.isNaN(ts.getTime())) return 'n/a'
  return ts.toLocaleString()
}

export default function FlowDetailPage() {
  const { id } = useParams()
  const [certReport, setCertReport] = useState<any | null>(null)
  const [certOpen, setCertOpen] = useState(false)

  const { data: flow } = useQuery({ queryKey: ['flow', id], queryFn: () => api.getFlow(id!) })
  const { data: jobs } = useQuery({
    queryKey: ['jobs', flow?.pcap_id],
    queryFn: () => api.listJobs(String(flow?.pcap_id)),
    enabled: !!flow?.pcap_id
  })
  const { data: issues } = useQuery({
    queryKey: ['flowIssues', flow?.pcap_id, id],
    queryFn: () => api.listIssuesForFlow(String(flow.pcap_id), id!),
    enabled: !!flow?.pcap_id
  })

  const inspectCert = async () => {
    if (!id) return
    const report = await api.certInspect(id)
    setCertReport(report)
    setCertOpen(true)
  }

  const subtitle = flow
    ? `${flow.client_ip}:${flow.client_port} → ${flow.server_ip}:${flow.server_port} (${flow.protocol})`
    : 'Loading flow details...'

  const mss = typeof flow?.mss === 'number' ? flow.mss : null
  const mtuV4 = mss ? mss + 40 : null
  const mtuV6 = mss ? mss + 60 : null
  const latestJob = jobs && jobs.length > 0 ? jobs[0] : null
  const severityLabel = (value?: number) => {
    if (!value) return 'n/a'
    if (value >= 4) return 'HIGH'
    if (value >= 2) return 'MED'
    return 'LOW'
  }

  const handshakeItems: DetailItem[] =
    flow?.protocol === 'TCP'
      ? [
          { label: 'SYN', value: formatTime(flow?.syn_time) },
          { label: 'SYN/ACK', value: formatTime(flow?.syn_ack_time) },
          { label: 'ACK', value: formatTime(flow?.ack_time) },
          {
            label: 'Handshake RTT',
            value: typeof flow?.handshake_rtt_ms_estimate === 'number' ? `${flow.handshake_rtt_ms_estimate.toFixed(1)} ms` : 'n/a'
          },
          { label: 'RSTs', value: flow?.rst_count ?? 0 }
        ]
      : [
          { label: 'UDP', value: 'Connectionless (no handshake)' },
          { label: 'First seen', value: formatTime(flow?.start_ts) },
          { label: 'Last seen', value: formatTime(flow?.end_ts) }
        ]

  const tlsItems: DetailItem[] = [
    { label: 'TLS Version', value: flow?.tls_version ?? 'n/a' },
    { label: 'ClientHello', value: flow?.tls_client_hello ? 'yes' : 'no' },
    { label: 'ServerHello', value: flow?.tls_server_hello ? 'yes' : 'no' },
    { label: 'TLS Alert', value: flow?.tls_alert ? `yes${flow.tls_alert_code ? ` (${flow.tls_alert_code})` : ''}` : 'no' },
    { label: 'SNI', value: flow?.tls_sni ?? 'n/a' },
    { label: 'ALPN', value: flow?.alpn ?? 'n/a' },
    { label: 'HTTP', value: flow?.http_method ? `${flow.http_method} ${flow.http_host || ''}`.trim() : 'n/a' }
  ]

  const metricsItems: DetailItem[] = [
    { label: 'TCP Stream', value: typeof flow?.tcp_stream === 'number' ? flow.tcp_stream : 'n/a' },
    { label: 'Bytes C→S', value: flow?.bytes_client_to_server ?? '—' },
    { label: 'Bytes S→C', value: flow?.bytes_server_to_client ?? '—' },
    { label: 'Throughput', value: typeof flow?.throughput_bps === 'number' ? `${Math.round(flow.throughput_bps)} B/s` : 'n/a' },
    { label: 'MSS', value: mss ?? 'n/a' },
    { label: 'Est. MTU (v4/v6)', value: mss ? `${mtuV4} / ${mtuV6}` : 'n/a' },
    { label: 'TCP Retransmits', value: flow?.tcp_retransmissions ?? 0 },
    { label: 'Out-of-Order', value: flow?.out_of_order ?? 0 },
    { label: 'Dup ACKs', value: flow?.dup_acks ?? 0 },
    { label: 'RSTs', value: flow?.rst_count ?? 0 },
    { label: 'Fragments', value: flow?.fragment_count ?? 0 }
  ]

  return (
    <Page>
      <div className="space-y-4">
        <Panel className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Flow Detail</div>
              <div className="text-sm font-mono text-muted-foreground">{subtitle}</div>
            </div>
            {flow?.tls_sni && (
              <Button variant="outline" onClick={inspectCert} size="sm">
                Cert Inspection
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {flow?.tls_sni && <Badge variant="low">SNI {flow.tls_sni}</Badge>}
            {flow?.tls_version && <Badge variant="low">{flow.tls_version}</Badge>}
            {flow?.alpn && <Badge variant="low">ALPN {flow.alpn}</Badge>}
            {flow?.http_host && <Badge variant="low">HTTP {flow.http_host}</Badge>}
          </div>
        </Panel>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Panel className="p-4">
            <div className="text-xs uppercase text-muted-foreground">RTT</div>
            <div className="text-xl font-semibold">
              {flow ? (typeof flow?.handshake_rtt_ms_estimate === 'number' ? `${flow.handshake_rtt_ms_estimate.toFixed(1)} ms` : 'n/a') : <Skeleton className="h-5 w-16" />}
            </div>
          </Panel>
          <Panel className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Retransmits</div>
            <div className="text-xl font-semibold">{flow?.tcp_retransmissions ?? <Skeleton className="h-5 w-10" />}</div>
          </Panel>
          <Panel className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Out-of-Order</div>
            <div className="text-xl font-semibold">{flow?.out_of_order ?? <Skeleton className="h-5 w-10" />}</div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Panel className="p-4">
            <div className="text-sm font-semibold">TCP/UDP Handshake</div>
            <div className="mt-2">
              <DetailList items={handshakeItems} />
            </div>
          </Panel>
          <Panel className="p-4">
            <div className="text-sm font-semibold">TLS Handshake</div>
            <div className="mt-2">
              <DetailList items={tlsItems} />
            </div>
          </Panel>
        </div>

        <Panel className="p-4">
          <div className="text-sm font-semibold">Metrics, MSS/MTU, Flags</div>
          <div className="mt-2">
            <DetailGrid items={metricsItems} />
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Issues</div>
            {latestJob ? (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/jobs/${latestJob.id}/triage`}>Open Triage</Link>
              </Button>
            ) : null}
          </div>
          <div className="space-y-2">
            {issues?.length ? (
              issues.map((issue: any) => (
                <div
                  key={issue.id}
                  className="flex items-center justify-between border border-border rounded-md px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium">{issue.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {severityLabel(issue.severity)} · {issue.issue_type}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={latestJob ? `/jobs/${latestJob.id}/triage?issue=${issue.id}` : '#'}>
                      Explain
                    </Link>
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground">No issues detected for this flow.</div>
            )}
          </div>
        </Panel>
      </div>

      <AnimatedDialog open={certOpen} onClose={() => setCertOpen(false)} title="Cert Inspection">
        {certReport ? (
          <div className="space-y-2 text-sm">
            <div>Subject: {certReport.subject}</div>
            <div>Issuer: {certReport.issuer}</div>
            <div>Expires: {certReport.not_after ? new Date(certReport.not_after).toLocaleString() : 'n/a'}</div>
            <div>Issues: {certReport.issues?.join(', ') || 'none'}</div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No inspection data available.</div>
        )}
      </AnimatedDialog>
    </Page>
  )
}
