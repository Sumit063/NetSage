import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Page } from '../components/Page'
import { Panel } from '../components/Panel'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'

function parseJsonField<T>(value: string | null): T {
  if (!value) return [] as T
  try {
    return JSON.parse(value) as T
  } catch {
    return [] as T
  }
}

export default function PcapDetailPage() {
  const { id } = useParams()

  const { data: summary } = useQuery({ queryKey: ['summary', id], queryFn: () => api.getSummary(id!) })
  const { data: stats } = useQuery({ queryKey: ['stats', id], queryFn: () => api.getStats(id!) })
  const { data: flows } = useQuery({ queryKey: ['flows', id], queryFn: () => api.listFlows(id!) })
  const { data: issues } = useQuery({ queryKey: ['issues', id], queryFn: () => api.listIssues(id!) })

  const topTalkers = parseJsonField<any[]>(stats?.top_talkers_json)
  const topFlows = parseJsonField<any[]>(stats?.top_flows_json)
  const hist = parseJsonField<any>(stats?.rtt_histogram_json)

  const issuesOverTime = Array.isArray(issues)
    ? issues.reduce((acc: Record<string, number>, issue: any) => {
        const day = new Date(issue.created_at).toLocaleDateString()
        acc[day] = (acc[day] || 0) + 1
        return acc
      }, {})
    : {}
  const issuesChart = Object.entries(issuesOverTime).map(([day, count]) => ({ day, count }))

  const rttData = hist?.buckets
    ? hist.buckets.map((bucket: number, index: number) => ({ bucket, count: hist.counts[index] || 0 }))
    : []

  const axisTick = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 }
  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--foreground))'
  }

  return (
    <Page>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Panel className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Total Flows</div>
            <div className="text-2xl font-semibold">{summary?.total_flows ?? <Skeleton className="h-6 w-20" />}</div>
          </Panel>
          <Panel className="p-4">
            <div className="text-xs uppercase text-muted-foreground">TCP / UDP</div>
            <div className="text-2xl font-semibold">
              {summary ? `${summary.tcp_flows || 0} / ${summary.udp_flows || 0}` : <Skeleton className="h-6 w-24" />}
            </div>
          </Panel>
          <Panel className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Issues H/M/L</div>
            <div className="text-2xl font-semibold">
              {summary
                ? `${summary?.issues?.HIGH || 0}/${summary?.issues?.MED || 0}/${summary?.issues?.LOW || 0}`
                : <Skeleton className="h-6 w-24" />}
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Panel className="p-4">
            <div className="text-sm font-semibold mb-2">Top Talkers</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topTalkers} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="key" hide />
                  <YAxis tick={axisTick} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel className="p-4">
            <div className="text-sm font-semibold mb-2">RTT Distribution (ms)</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rttData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="bucket" tick={axisTick} />
                  <YAxis tick={axisTick} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Panel className="p-4">
            <div className="text-sm font-semibold mb-2">Issues Over Time</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={issuesChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="issueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={axisTick} />
                  <YAxis allowDecimals={false} tick={axisTick} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--chart-2))"
                    fill="url(#issueFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel className="p-4">
            <div className="text-sm font-semibold mb-2">Top Flows</div>
            <div className="space-y-2 max-h-64 overflow-auto scroll-sharp">
              {topFlows?.map((flow: any) => (
                <div key={flow.key} className="flex items-center justify-between text-sm">
                  <div className="font-mono text-xs text-muted-foreground truncate max-w-[70%]">{flow.key}</div>
                  <div className="text-xs font-medium">{Math.round(flow.value / 1024)} KB</div>
                </div>
              ))}
              {!topFlows?.length && <div className="text-xs text-muted-foreground">No data yet.</div>}
            </div>
          </Panel>
        </div>

        <Panel className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Recent Flows</div>
            <Button variant="outline" asChild>
              <Link to={`/issues?pcap=${id}`}>View Issues</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {flows?.slice(0, 10).map((flow: any) => (
              <div key={flow.id} className="flex items-center justify-between border border-border rounded-md p-2">
                <div>
                  <div className="text-sm font-medium">
                    {flow.src_ip}:{flow.src_port} → {flow.dst_ip}:{flow.dst_port} ({flow.proto})
                  </div>
                  <div className="text-xs text-muted-foreground">
                    RTT {typeof flow.rtt_ms === 'number' ? flow.rtt_ms.toFixed(1) : 'n/a'} ms · Retrans {flow.retransmits}
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/flows/${flow.id}`}>Inspect</Link>
                </Button>
              </div>
            ))}
            {!flows?.length && <div className="text-xs text-muted-foreground">No flows found.</div>}
          </div>
        </Panel>
      </div>
    </Page>
  )
}
