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
    ? `${flow.src_ip}:${flow.src_port} → ${flow.dst_ip}:${flow.dst_port} (${flow.proto})`
    : 'Loading flow details...'

  const mss = typeof flow?.mss === 'number' ? flow.mss : null
  const mtuV4 = mss ? mss + 40 : null
  const mtuV6 = mss ? mss + 60 : null

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
              {flow ? (typeof flow?.rtt_ms === 'number' ? `${flow.rtt_ms.toFixed(1)} ms` : 'n/a') : <Skeleton className="h-5 w-16" />}
            </div>
          </Panel>
          <Panel className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Retransmits</div>
            <div className="text-xl font-semibold">{flow?.retransmits ?? <Skeleton className="h-5 w-10" />}</div>
          </Panel>
          <Panel className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Out-of-Order</div>
            <div className="text-xl font-semibold">{flow?.out_of_order ?? <Skeleton className="h-5 w-10" />}</div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Panel className="p-4">
            <div className="text-sm font-semibold">TCP/UDP Handshake</div>
            {flow?.proto === 'TCP' ? (
              <div className="space-y-1 mt-2 text-sm">
                <div>SYN: {formatTime(flow?.syn_time)}</div>
                <div>SYN/ACK: {formatTime(flow?.syn_ack_time)}</div>
                <div>ACK: {formatTime(flow?.ack_time)}</div>
                <div>Handshake RTT: {typeof flow?.rtt_ms === 'number' ? `${flow.rtt_ms.toFixed(1)} ms` : 'n/a'}</div>
                <div>RSTs: {flow?.rst_count ?? 0}</div>
              </div>
            ) : (
              <div className="space-y-1 mt-2 text-sm text-muted-foreground">
                <div>UDP is connectionless (no handshake).</div>
                <div>First seen: {formatTime(flow?.first_seen)}</div>
                <div>Last seen: {formatTime(flow?.last_seen)}</div>
              </div>
            )}
          </Panel>
          <Panel className="p-4">
            <div className="text-sm font-semibold">TLS Handshake</div>
            <div className="grid grid-cols-2 gap-2 text-sm mt-2">
              <div className="text-muted-foreground">TLS Version</div>
              <div className="font-mono">{flow?.tls_version ?? 'n/a'}</div>
              <div className="text-muted-foreground">ClientHello</div>
              <div className="font-mono">{flow?.tls_client_hello ? 'yes' : 'no'}</div>
              <div className="text-muted-foreground">ServerHello</div>
              <div className="font-mono">{flow?.tls_server_hello ? 'yes' : 'no'}</div>
              <div className="text-muted-foreground">TLS Alert</div>
              <div className="font-mono">{flow?.tls_alert ? 'yes' : 'no'}</div>
              <div className="text-muted-foreground">SNI</div>
              <div className="font-mono">{flow?.tls_sni ?? 'n/a'}</div>
              <div className="text-muted-foreground">ALPN</div>
              <div className="font-mono">{flow?.alpn ?? 'n/a'}</div>
              <div className="text-muted-foreground">HTTP</div>
              <div className="font-mono">
                {flow?.http_method ? `${flow.http_method} ${flow.http_host || ''}` : 'n/a'}
              </div>
            </div>
          </Panel>
        </div>

        <Panel className="p-4">
          <div className="text-sm font-semibold">Metrics, MSS/MTU, Flags</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm mt-2">
            <div className="text-muted-foreground">Bytes Sent</div>
            <div className="font-mono">{flow?.bytes_sent ?? '—'}</div>
            <div className="text-muted-foreground">Bytes Recv</div>
            <div className="font-mono">{flow?.bytes_recv ?? '—'}</div>
            <div className="text-muted-foreground">Throughput</div>
            <div className="font-mono">{typeof flow?.throughput_bps === 'number' ? `${Math.round(flow.throughput_bps)} B/s` : 'n/a'}</div>
            <div className="text-muted-foreground">MSS</div>
            <div className="font-mono">{mss ?? 'n/a'}</div>
            <div className="text-muted-foreground">Est. MTU (v4/v6)</div>
            <div className="font-mono">{mss ? `${mtuV4} / ${mtuV6}` : 'n/a'}</div>
            <div className="text-muted-foreground">Retransmits</div>
            <div className="font-mono">{flow?.retransmits ?? 0}</div>
            <div className="text-muted-foreground">Out-of-Order</div>
            <div className="font-mono">{flow?.out_of_order ?? 0}</div>
            <div className="text-muted-foreground">RSTs</div>
            <div className="font-mono">{flow?.rst_count ?? 0}</div>
            <div className="text-muted-foreground">Fragments</div>
            <div className="font-mono">{flow?.fragment_count ?? 0}</div>
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Issues</div>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/issues?pcap=${flow?.pcap_id}`}>Open Issues</Link>
            </Button>
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
                      {issue.severity} · {issue.type}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/issues?pcap=${flow?.pcap_id}&issue=${issue.id}`}>Explain</Link>
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
