import { Box, Button, Grid, Paper, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

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

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper className="glass" sx={{ padding: 3 }}>
            <Typography variant="overline" color="text.secondary">
              Total Flows
            </Typography>
            <Typography variant="h4">{summary?.total_flows || 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper className="glass" sx={{ padding: 3 }}>
            <Typography variant="overline" color="text.secondary">
              TCP / UDP
            </Typography>
            <Typography variant="h4">
              {summary?.tcp_flows || 0} / {summary?.udp_flows || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper className="glass" sx={{ padding: 3 }}>
            <Typography variant="overline" color="text.secondary">
              Issues (H/M/L)
            </Typography>
            <Typography variant="h4">
              {summary?.issues?.HIGH || 0}/{summary?.issues?.MED || 0}/{summary?.issues?.LOW || 0}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ marginTop: 1 }}>
        <Grid item xs={12} md={6}>
          <Paper className="glass" sx={{ padding: 3, height: 320 }}>
            <Typography variant="h6">Top Talkers</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={topTalkers} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="key" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#1f7a8c" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper className="glass" sx={{ padding: 3, height: 320 }}>
            <Typography variant="h6">RTT Distribution (ms)</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={rttData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#e08e45" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ marginTop: 1 }}>
        <Grid item xs={12} md={6}>
          <Paper className="glass" sx={{ padding: 3, height: 320 }}>
            <Typography variant="h6">Issues Over Time</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={issuesChart} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line dataKey="count" stroke="#1f7a8c" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper className="glass" sx={{ padding: 3, height: 320 }}>
            <Typography variant="h6">Top Flows</Typography>
            <Stack spacing={1} sx={{ marginTop: 1, maxHeight: 250, overflow: 'auto' }}>
              {topFlows?.map((flow: any) => (
                <Box key={flow.key} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">{flow.key}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Math.round(flow.value / 1024)} KB
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper className="glass" sx={{ padding: 3, marginTop: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Recent Flows</Typography>
          <Button component={Link} to={`/issues?pcap=${id}`} variant="outlined">
            View Issues
          </Button>
        </Stack>
        <Stack spacing={1} sx={{ marginTop: 2 }}>
          {flows?.slice(0, 10).map((flow: any) => (
            <Box
              key={flow.id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: 2,
                border: '1px solid #e3e6eb',
                borderRadius: 2
              }}
            >
              <Box>
                <Typography variant="subtitle2">
                  {flow.src_ip}:{flow.src_port} → {flow.dst_ip}:{flow.dst_port} ({flow.proto})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  RTT {typeof flow.rtt_ms === 'number' ? flow.rtt_ms.toFixed(1) : 'n/a'} ms · Retrans {flow.retransmits}
                </Typography>
              </Box>
              <Button component={Link} to={`/flows/${flow.id}`} variant="contained">
                Inspect
              </Button>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Box>
  )
}
