import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FlowSummary, StreamTimeseries } from '../../types/viewer'
import { Panel } from '../Panel'
import { Badge } from '../ui/badge'
import { formatBytes, formatDurationMs } from '../../utils/format'
import { ExpandableChartPanel } from '../charts/ExpandableChartPanel'
import { chartAxisTick, chartTooltip, createRelativeTimeFormatter } from '../../utils/chartTheme'

type StreamSummaryPanelProps = {
  streamNumber: number
  summary?: FlowSummary
  timeseries?: StreamTimeseries
  isLoading?: boolean
}

export function StreamSummaryPanel({ streamNumber, summary, timeseries, isLoading }: StreamSummaryPanelProps) {
  const rttValue = typeof summary?.handshake_rtt_ms_estimate === 'number' ? summary?.handshake_rtt_ms_estimate : null
  const rttSeries =
    summary?.start_ts && summary?.end_ts && rttValue !== null
      ? [
          { ts: summary.start_ts, value: rttValue },
          { ts: summary.end_ts, value: rttValue }
        ]
      : []

  const tickFormatter = createRelativeTimeFormatter(timeseries?.packets_per_sec?.[0]?.ts)

  const isSummaryLoading = isLoading && !summary
  const isSeriesLoading = isLoading && !timeseries

  const renderRttChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rttSeries}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="ts" tick={chartAxisTick} tickFormatter={tickFormatter} />
        <YAxis tick={chartAxisTick} />
        <Tooltip {...chartTooltip} labelFormatter={(value) => `t=${tickFormatter(String(value))}`} />
        <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )

  const packetSeries = timeseries?.packets_per_sec || []
  const renderPacketsChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={packetSeries}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="ts" tick={chartAxisTick} tickFormatter={tickFormatter} />
        <YAxis tick={chartAxisTick} />
        <Tooltip {...chartTooltip} labelFormatter={(value) => `t=${tickFormatter(String(value))}`} />
        <Line type="monotone" dataKey="outbound" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="inbound" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )

  const byteSeries = timeseries?.bytes_per_sec || []
  const renderBytesChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={byteSeries}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="ts" tick={chartAxisTick} tickFormatter={tickFormatter} />
        <YAxis tick={chartAxisTick} />
        <Tooltip {...chartTooltip} labelFormatter={(value) => `t=${tickFormatter(String(value))}`} />
        <Line type="monotone" dataKey="outbound" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="inbound" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )

  return (
    <Panel className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Stream Summary</div>
        <Badge>Stream #{streamNumber}</Badge>
      </div>

      {summary ? (
        <div className="space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-secondary/40 text-foreground">Details</Badge>
            <Badge className="bg-secondary/40 text-foreground">Metrics</Badge>
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">
            {summary.client_ip}:{summary.client_port} → {summary.server_ip}:{summary.server_port} ({summary.protocol})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            <div className="flex items-center justify-between rounded-md border border-border/60 px-2 py-1.5">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">First/Last</span>
              <span className="font-mono text-[11px]">
                {new Date(summary.start_ts).toLocaleString()} / {new Date(summary.end_ts).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 px-2 py-1.5">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Duration</span>
              <span className="font-mono text-[11px]">{formatDurationMs(summary.duration_ms)}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 px-2 py-1.5">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Bytes Out/In</span>
              <span className="font-mono text-[11px]">
                {formatBytes(summary.bytes_client_to_server)} / {formatBytes(summary.bytes_server_to_client)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 px-2 py-1.5">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Packets</span>
              <span className="font-mono text-[11px]">{summary.packet_count}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 px-2 py-1.5">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Handshake RTT</span>
              <span className="font-mono text-[11px]">{rttValue !== null ? `${rttValue.toFixed(1)} ms` : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 px-2 py-1.5">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Retrans / Dup ACKs</span>
              <span className="font-mono text-[11px]">
                {summary.tcp_retransmissions} / {summary.dup_acks}
              </span>
            </div>
          </div>
        </div>
      ) : isSummaryLoading ? (
        <div className="text-xs text-muted-foreground">Loading stream summary…</div>
      ) : (
        <div className="text-xs text-muted-foreground">Stream summary not available.</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ExpandableChartPanel
          title="RTT (handshake)"
          heightClassName="h-32"
          panelClassName="p-3"
          renderChart={renderRttChart}
          empty={!rttSeries.length}
          emptyLabel={isSeriesLoading ? 'Loading RTT series…' : 'No RTT series.'}
          modalHeightClassName="h-[60vh]"
        />

        <ExpandableChartPanel
          title="Packets (in/out)"
          heightClassName="h-32"
          panelClassName="p-3"
          renderChart={renderPacketsChart}
          empty={!packetSeries.length}
          emptyLabel={isSeriesLoading ? 'Loading packet series…' : 'No packet series.'}
          modalHeightClassName="h-[60vh]"
        />

        <ExpandableChartPanel
          title="Bytes (in/out)"
          heightClassName="h-32"
          panelClassName="p-3"
          renderChart={renderBytesChart}
          empty={!byteSeries.length}
          emptyLabel={isSeriesLoading ? 'Loading byte series…' : 'No byte series.'}
          modalHeightClassName="h-[60vh]"
        />
      </div>
    </Panel>
  )
}
