import { useState } from 'react'
import { Box, Button, Chip, Grid, Paper, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'

export default function FlowDetailPage() {
  const { id } = useParams()
  const [certReport, setCertReport] = useState<any | null>(null)

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
  }

  return (
    <Box>
      <Paper className="glass" sx={{ padding: 3, marginBottom: 2 }}>
        <Typography variant="h5">Flow Detail</Typography>
        <Typography variant="body2" color="text.secondary">
          {flow?.src_ip}:{flow?.src_port} → {flow?.dst_ip}:{flow?.dst_port} ({flow?.proto})
        </Typography>
        <Stack direction="row" spacing={1} sx={{ marginTop: 2, flexWrap: 'wrap' }}>
          {flow?.tls_sni && <Chip label={`SNI ${flow.tls_sni}`} />}
          {flow?.tls_version && <Chip label={flow.tls_version} />}
          {flow?.alpn && <Chip label={`ALPN ${flow.alpn}`} />}
          {flow?.http_host && <Chip label={`HTTP ${flow.http_host}`} />}
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper className="glass" sx={{ padding: 3, height: '100%' }}>
            <Typography variant="h6">Timeline</Typography>
            <Stack spacing={1} sx={{ marginTop: 2 }}>
              <Typography variant="body2">SYN: {flow?.syn_time || 'n/a'}</Typography>
              <Typography variant="body2">SYN/ACK: {flow?.syn_ack_time || 'n/a'}</Typography>
              <Typography variant="body2">ACK: {flow?.ack_time || 'n/a'}</Typography>
              <Typography variant="body2">TLS Hello: {flow?.tls_version ? 'observed' : 'n/a'}</Typography>
              <Typography variant="body2">HTTP Request: {flow?.http_time || 'n/a'}</Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper className="glass" sx={{ padding: 3, height: '100%' }}>
            <Typography variant="h6">Metrics</Typography>
            <Stack spacing={1} sx={{ marginTop: 2 }}>
              <Typography variant="body2">
                RTT: {typeof flow?.rtt_ms === 'number' ? `${flow.rtt_ms.toFixed(1)} ms` : 'n/a'}
              </Typography>
              <Typography variant="body2">Bytes Sent: {flow?.bytes_sent}</Typography>
              <Typography variant="body2">Bytes Recv: {flow?.bytes_recv}</Typography>
              <Typography variant="body2">Retransmits: {flow?.retransmits}</Typography>
              <Typography variant="body2">Out of Order: {flow?.out_of_order}</Typography>
              <Typography variant="body2">MSS: {flow?.mss || 'n/a'}</Typography>
              <Typography variant="body2">Fragments: {flow?.fragment_count}</Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper className="glass" sx={{ padding: 3, marginTop: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Issues</Typography>
          {flow?.tls_sni && (
            <Button variant="outlined" onClick={inspectCert}>
              Run Cert Inspection
            </Button>
          )}
        </Stack>
        <Stack spacing={2} sx={{ marginTop: 2 }}>
          {issues?.length ? (
            issues.map((issue: any) => (
              <Box
                key={issue.id}
                sx={{
                  border: '1px solid #e3e6eb',
                  borderRadius: 2,
                  padding: 2,
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <Box>
                  <Typography variant="subtitle2">{issue.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {issue.severity} · {issue.type}
                  </Typography>
                </Box>
                <Button
                  component={Link}
                  to={`/issues?pcap=${flow?.pcap_id}&issue=${issue.id}`}
                  variant="contained"
                  size="small"
                >
                  Explain
                </Button>
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No issues detected for this flow.
            </Typography>
          )}
        </Stack>
      </Paper>

      {certReport && (
        <Paper className="glass" sx={{ padding: 3, marginTop: 2 }}>
          <Typography variant="h6">Cert Inspection</Typography>
          <Typography variant="body2">Subject: {certReport.subject}</Typography>
          <Typography variant="body2">Issuer: {certReport.issuer}</Typography>
          <Typography variant="body2">Expires: {new Date(certReport.not_after).toLocaleString()}</Typography>
          <Typography variant="body2">Issues: {certReport.issues?.join(', ') || 'none'}</Typography>
        </Paper>
      )}
    </Box>
  )
}
