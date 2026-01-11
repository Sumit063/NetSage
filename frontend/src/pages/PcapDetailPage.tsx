import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
        const day = new Date(issue.created_at).toISOString().slice(0, 10)
        acc[day] = (acc[day] || 0) + 1
        return acc
      }, {})
    : {}
  const issuesChart = Object.entries(issuesOverTime)
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => (a.day < b.day ? -1 : 1))

  const rttData = hist?.buckets
    ? hist.buckets.map((bucket: number, index: number) => ({ bucket, count: hist.counts[index] || 0 }))
    : []

  const axisTick = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 }
  const axisLabel = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--foreground))'
  }
  const tooltipLabelStyle = { color: 'hsl(var(--foreground))' }
  const tooltipItemStyle = { color: 'hsl(var(--foreground))' }
  const protocolPie = summary
    ? [
        { name: 'TCP', value: summary.tcp_flows || 0 },
        { name: 'UDP', value: summary.udp_flows || 0 }
      ]
    : []
  const issuePie = summary
    ? [
        { name: 'HIGH', value: summary.issues?.HIGH || 0 },
        { name: 'MED', value: summary.issues?.MED || 0 },
        { name: 'LOW', value: summary.issues?.LOW || 0 }
      ]
    : []

  const renderPieLabel = (props: { cx: number; cy: number; midAngle: number; outerRadius: number; name: string; value: number }) => {
    const radius = props.outerRadius + 14
    const x = props.cx + radius * Math.cos(-props.midAngle * (Math.PI / 180))
    const y = props.cy + radius * Math.sin(-props.midAngle * (Math.PI / 180))
    return (
      <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > props.cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
        {props.name} {props.value}
      </text>
    )
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
            <div className="text-sm font-semibold mb-2">Protocol Split</div>
            <div className="h-64 flex items-center">
              {protocolPie.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                    <Pie
                      data={protocolPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                      labelLine={false}
                      label={renderPieLabel}
                    >
                      {protocolPie.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.name === 'TCP' ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-4))'}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-muted-foreground">No data yet.</div>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-[hsl(var(--chart-1))]" /> TCP
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-[hsl(var(--chart-4))]" /> UDP
              </span>
            </div>
          </Panel>
          <Panel className="p-4">
            <div className="text-sm font-semibold mb-2">Issues by Severity</div>
            <div className="h-64 flex items-center">
              {issuePie.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                    <Pie
                      data={issuePie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                      labelLine={false}
                      label={renderPieLabel}
                    >
                      {issuePie.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            entry.name === 'HIGH'
                              ? 'hsl(var(--chart-5))'
                              : entry.name === 'MED'
                              ? 'hsl(var(--chart-3))'
                              : 'hsl(var(--chart-2))'
                          }
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-muted-foreground">No issues yet.</div>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-[hsl(var(--chart-5))]" /> HIGH
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-[hsl(var(--chart-3))]" /> MED
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-[hsl(var(--chart-2))]" /> LOW
              </span>
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Panel className="p-4">
            <div className="text-sm font-semibold mb-2">Top Talkers</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={topTalkers} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="key" tick={false} label={{ value: 'Talker', position: 'insideBottom', offset: -4, ...axisLabel }} />
                  <YAxis tick={axisTick} label={{ value: 'Bytes', angle: -90, position: 'insideLeft', ...axisLabel }} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel className="p-4">
            <div className="text-sm font-semibold mb-2">RTT Distribution (ms)</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rttData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="bucket" tick={axisTick} label={{ value: 'RTT bucket (ms)', position: 'insideBottom', offset: -4, ...axisLabel }} />
                  <YAxis tick={axisTick} label={{ value: 'Count', angle: -90, position: 'insideLeft', ...axisLabel }} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Panel className="p-4">
            <div className="text-sm font-semibold mb-2">Issues Over Time</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={issuesChart} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={axisTick} label={{ value: 'Date', position: 'insideBottom', offset: -4, ...axisLabel }} />
                  <YAxis allowDecimals={false} tick={axisTick} label={{ value: 'Issues', angle: -90, position: 'insideLeft', ...axisLabel }} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                </LineChart>
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
