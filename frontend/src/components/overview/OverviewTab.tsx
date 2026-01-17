import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Panel } from '../Panel'
import { Skeleton } from '../ui/skeleton'
import { formatBytes, formatDurationMs } from '../../utils/format'
import { JobSummary, TopConversation } from '../../types/viewer'
import { PacketFilters } from '../../utils/filters'
import { ExpandableChartPanel } from '../charts/ExpandableChartPanel'
import { DataTable, DataTableColumn } from '../DataTable'
import { chartAxisLabel, chartAxisTick, chartTooltip, createRelativeTimeFormatter } from '../../utils/chartTheme'

type OverviewTabProps = {
  summary?: JobSummary
  onApplyFilters: (filters: PacketFilters) => void
}

export function OverviewTab({ summary, onApplyFilters }: OverviewTabProps) {
  const totals = summary?.totals
  const packetsSeries = summary?.timeseries?.packets_per_sec || []
  const bytesSeries = summary?.timeseries?.bytes_per_sec || []
  const protocolCounts = summary?.protocol_counts || {}
  const streamCounts = summary?.stream_counts || {}
  const appProtocols = summary?.app_protocols || {}

  const protocolChart = Object.entries(protocolCounts).map(([name, value]) => ({ name, value }))

  const tickFormatter = createRelativeTimeFormatter(packetsSeries[0]?.ts)

  const conversationColumns = [
    {
      key: 'conversation',
      header: 'Conversation',
      cell: (conversation: TopConversation) => (
        <button
          type="button"
          className="font-mono text-xs text-left text-primary"
          onClick={() => {
            const proto = conversation.protocol === 'TCP' || conversation.protocol === 'UDP' ? conversation.protocol : undefined
            onApplyFilters({
              srcIp: conversation.client_ip,
              dstIp: conversation.server_ip,
              srcPort: String(conversation.client_port),
              dstPort: String(conversation.server_port),
              proto,
              pair: true
            })
          }}
        >
          {conversation.client_ip}:{conversation.client_port} → {conversation.server_ip}:{conversation.server_port}
        </button>
      )
    },
    {
      key: 'proto',
      header: 'Proto',
      cell: (conversation: TopConversation) => conversation.protocol,
      headerClassName: 'text-center',
      cellClassName: 'text-center'
    },
    {
      key: 'packets',
      header: 'Packets',
      cell: (conversation: TopConversation) => conversation.packets,
      headerClassName: 'text-center',
      cellClassName: 'text-center'
    },
    {
      key: 'bytes',
      header: 'Bytes',
      cell: (conversation: TopConversation) => formatBytes(conversation.bytes),
      headerClassName: 'text-center',
      cellClassName: 'text-center'
    },
    {
      key: 'duration',
      header: 'Duration',
      cell: (conversation: TopConversation) => formatDurationMs(conversation.duration_ms),
      headerClassName: 'text-center',
      cellClassName: 'text-center'
    }
  ] satisfies DataTableColumn<TopConversation>[]

  const renderPacketsChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={packetsSeries}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="ts"
          tick={chartAxisTick}
          tickFormatter={tickFormatter}
          label={{ value: 'Time', position: 'insideBottom', offset: -4, ...chartAxisLabel }}
        />
        <YAxis tick={chartAxisTick} label={{ value: 'Packets', angle: -90, position: 'insideLeft', ...chartAxisLabel }} />
        <Tooltip {...chartTooltip} labelFormatter={(value) => `t=${tickFormatter(String(value))}`} />
        <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )

  const renderBytesChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={bytesSeries}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="ts"
          tick={chartAxisTick}
          tickFormatter={tickFormatter}
          label={{ value: 'Time', position: 'insideBottom', offset: -4, ...chartAxisLabel }}
        />
        <YAxis tick={chartAxisTick} label={{ value: 'Bytes', angle: -90, position: 'insideLeft', ...chartAxisLabel }} />
        <Tooltip {...chartTooltip} labelFormatter={(value) => `t=${tickFormatter(String(value))}`} />
        <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )

  const renderProtocolChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={protocolChart}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={chartAxisTick} />
        <YAxis tick={chartAxisTick} />
        <Tooltip {...chartTooltip} />
        <Bar dataKey="value" fill="hsl(var(--chart-2))" barSize={18} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Panel className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Total Packets</div>
          <div className="text-2xl font-semibold">{totals ? totals.total_packets : <Skeleton className="h-6 w-20" />}</div>
        </Panel>
        <Panel className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Total Bytes</div>
          <div className="text-2xl font-semibold">{totals ? formatBytes(totals.total_bytes) : <Skeleton className="h-6 w-20" />}</div>
        </Panel>
        <Panel className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Streams</div>
          <div className="text-2xl font-semibold">{totals ? totals.total_streams : <Skeleton className="h-6 w-20" />}</div>
        </Panel>
        <Panel className="p-4">
          <div className="text-xs uppercase text-muted-foreground">TCP / UDP</div>
          <div className="text-2xl font-semibold">
            {totals ? `${totals.tcp_streams} / ${totals.udp_streams}` : <Skeleton className="h-6 w-20" />}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ExpandableChartPanel
          title="Packets per Second"
          heightClassName="h-60"
          renderChart={renderPacketsChart}
          empty={!packetsSeries.length}
          emptyLabel="No time series data."
        />
        <ExpandableChartPanel
          title="Bytes per Second"
          heightClassName="h-60"
          renderChart={renderBytesChart}
          empty={!bytesSeries.length}
          emptyLabel="No time series data."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ExpandableChartPanel
          title="Protocol Breakdown"
          heightClassName="h-52"
          renderChart={renderProtocolChart}
          empty={!protocolChart.length}
          emptyLabel="No protocol data."
        />

        <Panel className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Top Sources</div>
          <div className="mt-2 space-y-1 text-sm">
            {summary?.top_sources?.map((src) => (
              <button
                key={src.ip}
                type="button"
                className="flex items-center justify-between w-full text-left"
                onClick={() => onApplyFilters({ srcIp: src.ip })}
              >
                <span className="font-mono text-xs text-primary">{src.ip}</span>
                <span className="text-muted-foreground">{src.packets}</span>
              </button>
            ))}
            {!summary?.top_sources?.length && <div className="text-xs text-muted-foreground">No data.</div>}
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Top Destinations</div>
          <div className="mt-2 space-y-1 text-sm">
            {summary?.top_destinations?.map((dst) => (
              <button
                key={dst.ip}
                type="button"
                className="flex items-center justify-between w-full text-left"
                onClick={() => onApplyFilters({ dstIp: dst.ip })}
              >
                <span className="font-mono text-xs text-primary">{dst.ip}</span>
                <span className="text-muted-foreground">{dst.packets}</span>
              </button>
            ))}
            {!summary?.top_destinations?.length && <div className="text-xs text-muted-foreground">No data.</div>}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Panel className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Top Ports</div>
          <div className="mt-2 space-y-1 text-sm">
            {summary?.top_ports?.map((port) => (
              <button
                key={port.port}
                type="button"
                className="flex items-center justify-between w-full text-left"
                onClick={() => onApplyFilters({ dstPort: String(port.port) })}
              >
                <span className="font-mono text-xs text-primary">{port.port}</span>
                <span className="text-muted-foreground">{port.packets}</span>
              </button>
            ))}
            {!summary?.top_ports?.length && <div className="text-xs text-muted-foreground">No data.</div>}
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Stream Counts</div>
          <div className="mt-2 space-y-1 text-sm">
            {Object.entries(streamCounts).map(([proto, count]) => (
              <div key={proto} className="flex items-center justify-between">
                <span className="text-muted-foreground">{proto}</span>
                <span className="font-mono">{count}</span>
              </div>
            ))}
            {!Object.keys(streamCounts).length && <div className="text-xs text-muted-foreground">No data.</div>}
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="text-xs uppercase text-muted-foreground">App Heuristics</div>
          <div className="mt-2 space-y-1 text-sm">
            {Object.entries(appProtocols).map(([label, count]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono">{count}</span>
              </div>
            ))}
            {!Object.keys(appProtocols).length && <div className="text-xs text-muted-foreground">No data.</div>}
          </div>
        </Panel>
      </div>

      <Panel className="p-4">
        <div className="text-sm font-semibold mb-2">Top Conversations</div>
        <DataTable
          data={summary?.top_conversations || []}
          columns={conversationColumns}
          emptyLabel="No conversations available."
          tableClassName="min-w-[820px]"
        />
      </Panel>
    </div>
  )
}
