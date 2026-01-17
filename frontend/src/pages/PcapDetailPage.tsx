import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Page } from '../components/Page'
import { Panel } from '../components/Panel'
import { Button } from '../components/ui/button'
import { Tabs } from '../components/ui/tabs'
import { ExpandableChartPanel } from '../components/charts/ExpandableChartPanel'
import { OverviewTab } from '../components/overview/OverviewTab'
import { useJobSummary } from '../hooks/useJobSummary'
import { PacketFilters, buildPacketSearchParams } from '../utils/filters'
import { chartAxisLabel, chartAxisTick, chartTooltip } from '../utils/chartTheme'

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
  const navigate = useNavigate()

  const { data: stats } = useQuery({ queryKey: ['stats', id], queryFn: () => api.getStats(id!) })
  const { data: flows } = useQuery({ queryKey: ['flows', id], queryFn: () => api.listFlows(id!) })
  const { data: issues } = useQuery({ queryKey: ['issues', id], queryFn: () => api.listIssues(id!) })
  const { data: jobs } = useQuery({ queryKey: ['jobs', id], queryFn: () => api.listJobs(id!), enabled: !!id })
  const latestJob = jobs && jobs.length > 0 ? jobs[0] : null
  const { data: jobSummary } = useJobSummary(latestJob?.id)

  const topFlows = parseJsonField<any[]>(stats?.top_flows_json)
  const hist = parseJsonField<any>(stats?.rtt_histogram_json)

  const issuesOverTime = Array.isArray(issues)
    ? issues.reduce((acc: Record<string, number>, issue: any) => {
        const day = new Date(issue.created_at).toISOString().slice(0, 10)
        acc[day] = (acc[day] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    : {}
  const issuesChart = Object.entries(issuesOverTime)
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => (a.day < b.day ? -1 : 1))

  const rttData = hist?.buckets
    ? hist.buckets.map((bucket: number, index: number) => ({ bucket, count: hist.counts[index] || 0 }))
    : []

  const issueCounts = Array.isArray(issues)
    ? issues.reduce(
        (acc: { HIGH: number; MED: number; LOW: number }, issue: any) => {
          if (!issue?.severity) return acc
          if (issue.severity >= 4) acc.HIGH += 1
          else if (issue.severity >= 2) acc.MED += 1
          else acc.LOW += 1
          return acc
        },
        { HIGH: 0, MED: 0, LOW: 0 }
      )
    : { HIGH: 0, MED: 0, LOW: 0 }
  const issueTotal = issueCounts.HIGH + issueCounts.MED + issueCounts.LOW
  const issueSeries = issueTotal
    ? [
        { name: 'HIGH', value: issueCounts.HIGH },
        { name: 'MED', value: issueCounts.MED },
        { name: 'LOW', value: issueCounts.LOW }
      ]
    : []

  const triageTabDisabled = !latestJob

  const handleApplyFilters = (filters: PacketFilters) => {
    if (!latestJob) return
    const params = buildPacketSearchParams(new URLSearchParams(), filters)
    navigate(`/jobs/${latestJob.id}/packets?${params.toString()}`)
  }

  const renderIssueSeverityChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={issueSeries} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={chartAxisTick} />
        <YAxis tick={chartAxisTick} />
        <Tooltip {...chartTooltip} />
        <Bar dataKey="value" fill="hsl(var(--chart-3))" barSize={18} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )

  const renderRttChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rttData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="bucket" tick={chartAxisTick} label={{ value: 'RTT bucket (ms)', position: 'insideBottom', offset: -4, ...chartAxisLabel }} />
        <YAxis tick={chartAxisTick} label={{ value: 'Count', angle: -90, position: 'insideLeft', ...chartAxisLabel }} />
        <Tooltip {...chartTooltip} />
        <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )

  const renderIssuesChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={issuesChart} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="day" tick={chartAxisTick} label={{ value: 'Date', position: 'insideBottom', offset: -4, ...chartAxisLabel }} />
        <YAxis allowDecimals={false} tick={chartAxisTick} label={{ value: 'Issues', angle: -90, position: 'insideLeft', ...chartAxisLabel }} />
        <Tooltip {...chartTooltip} />
        <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )

  return (
    <Page>
      <div className="space-y-4">
        <Tabs
          value="overview"
          onValueChange={(val) => {
            if (val === 'packets' && latestJob) {
              navigate(`/jobs/${latestJob.id}/packets`)
            }
            if (val === 'triage' && latestJob) {
              navigate(`/jobs/${latestJob.id}/triage`)
            }
          }}
          tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'packets', label: 'Packets', disabled: triageTabDisabled },
            { value: 'triage', label: 'Triage', disabled: triageTabDisabled }
          ]}
        />

        <OverviewTab summary={jobSummary} onApplyFilters={handleApplyFilters} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ExpandableChartPanel
            title="Issues by Severity"
            heightClassName="h-64"
            renderChart={renderIssueSeverityChart}
            empty={!issueSeries.length}
            emptyLabel="No issues yet."
          />
          <ExpandableChartPanel
            title="Issues Over Time"
            heightClassName="h-64"
            renderChart={renderIssuesChart}
            empty={!issuesChart.length}
            emptyLabel="No issues yet."
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ExpandableChartPanel
            title="RTT Distribution (ms)"
            heightClassName="h-64"
            renderChart={renderRttChart}
            empty={!rttData.length}
            emptyLabel="No data yet."
          />
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
            {latestJob ? (
              <Button variant="outline" asChild>
                <Link to={`/jobs/${latestJob.id}/triage`}>Open Triage</Link>
              </Button>
            ) : null}
          </div>
          <div className="space-y-2">
            {flows?.slice(0, 10).map((flow: any) => (
              <div key={flow.id} className="flex items-center justify-between border border-border rounded-md p-2">
                <div>
                  <div className="text-sm font-medium">
                    {flow.client_ip}:{flow.client_port} → {flow.server_ip}:{flow.server_port} ({flow.protocol})
                  </div>
                  <div className="text-xs text-muted-foreground">
                    RTT {typeof flow.handshake_rtt_ms_estimate === 'number' ? flow.handshake_rtt_ms_estimate.toFixed(1) : 'n/a'} ms · Retrans {flow.tcp_retransmissions}
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
