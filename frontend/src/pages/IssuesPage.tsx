import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useSearchParams } from 'react-router-dom'

export default function IssuesPage() {
  const [searchParams] = useSearchParams()
  const initialPcap = searchParams.get('pcap') || ''
  const initialIssue = searchParams.get('issue') || ''
  const { data: pcaps } = useQuery({ queryKey: ['pcaps'], queryFn: api.listPcaps })
  const [selectedPcap, setSelectedPcap] = useState<string>(initialPcap)
  const [severity, setSeverity] = useState<string>('')
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null)
  const [explanation, setExplanation] = useState<any | null>(null)

  const { data: issues } = useQuery({
    queryKey: ['issues', selectedPcap],
    queryFn: () => api.listIssues(selectedPcap),
    enabled: !!selectedPcap
  })

  useEffect(() => {
    if (issues && initialIssue) {
      const match = issues.find((issue: any) => String(issue.id) === initialIssue)
      if (match) {
        setSelectedIssue(match)
      }
    }
  }, [issues, initialIssue])

  useEffect(() => {
    setSelectedIssue(null)
    setExplanation(null)
  }, [selectedPcap, severity])

  const filtered = useMemo(() => {
    if (!issues) return []
    return issues.filter((issue: any) => (severity ? issue.severity === severity : true))
  }, [issues, severity])

  const explain = async () => {
    if (!selectedIssue) return
    const data = await api.explainIssue(String(selectedIssue.id))
    setExplanation(data)
  }

  return (
    <Box>
      <Paper className="glass" sx={{ padding: 3, marginBottom: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <Box>
            <Typography variant="h5">Issues</Typography>
            <Typography variant="body2" color="text.secondary">
              Filter by severity and ask AI to explain a finding.
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Select
            value={selectedPcap}
            onChange={(e) => setSelectedPcap(String(e.target.value))}
            displayEmpty
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Select PCAP</MenuItem>
            {pcaps?.map((pcap: any) => (
              <MenuItem key={pcap.id} value={pcap.id}>
                {pcap.filename}
              </MenuItem>
            ))}
          </Select>
          <Select value={severity} onChange={(e) => setSeverity(String(e.target.value))} displayEmpty>
            <MenuItem value="">All Severities</MenuItem>
            <MenuItem value="HIGH">HIGH</MenuItem>
            <MenuItem value="MED">MED</MenuItem>
            <MenuItem value="LOW">LOW</MenuItem>
          </Select>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper className="glass" sx={{ padding: 3, height: '100%' }}>
            <Typography variant="h6">Issue List</Typography>
            <Stack spacing={2} sx={{ marginTop: 2 }}>
              {filtered.map((issue: any) => (
                <Box
                  key={issue.id}
                  sx={{
                    border: '1px solid #e3e6eb',
                    borderRadius: 2,
                    padding: 2,
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setSelectedIssue(issue)
                    setExplanation(null)
                  }}
                >
                  <Typography variant="subtitle2">{issue.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {issue.severity} · {issue.type}
                  </Typography>
                </Box>
              ))}
              {!filtered.length && (
                <Typography variant="body2" color="text.secondary">
                  Select a PCAP to view issues.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper className="glass" sx={{ padding: 3, height: '100%' }}>
            <Typography variant="h6">Explain This Issue</Typography>
            {selectedIssue ? (
              <Stack spacing={2} sx={{ marginTop: 2 }}>
                <Typography variant="subtitle2">{selectedIssue.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedIssue.description}
                </Typography>
                <Button variant="contained" onClick={explain}>
                  Explain with AI
                </Button>
                {explanation && (
                  <Box>
                    <Typography variant="subtitle2">AI Response</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', marginTop: 1 }}>
                      {explanation.response}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ marginTop: 2 }}>
                      Data Shared
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(explanation.shared, null, 2)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ marginTop: 2 }}>
                Select an issue to view details and generate an explanation.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
