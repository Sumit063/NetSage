import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography
} from '@mui/material'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

function PcapCard({ pcap }: { pcap: any }) {
  const { data: jobs } = useQuery({ queryKey: ['jobs', pcap.id], queryFn: () => api.listJobs(String(pcap.id)) })
  const latest = jobs && jobs.length > 0 ? jobs[0] : null

  return (
    <Paper className="glass" sx={{ padding: 3, height: '100%' }}>
      <Stack spacing={1}>
        <Typography variant="h6">{pcap.filename}</Typography>
        <Typography variant="body2" color="text.secondary">
          Uploaded {new Date(pcap.uploaded_at).toLocaleString()}
        </Typography>
        {latest && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Latest job: {latest.status}
            </Typography>
            <LinearProgress value={latest.progress} variant="determinate" sx={{ marginTop: 1 }} />
          </Box>
        )}
        <Button component={Link} to={`/pcaps/${pcap.id}`} variant="contained">
          View Details
        </Button>
      </Stack>
    </Paper>
  )
}

export default function PcapsPage() {
  const [file, setFile] = useState<File | null>(null)
  const queryClient = useQueryClient()

  const { data: pcaps, isLoading } = useQuery({ queryKey: ['pcaps'], queryFn: api.listPcaps })

  const uploadMutation = useMutation({
    mutationFn: (f: File) => api.uploadPcap(f),
    onSuccess: () => {
      setFile(null)
      queryClient.invalidateQueries({ queryKey: ['pcaps'] })
    }
  })

  const onUpload = () => {
    if (file) {
      uploadMutation.mutate(file)
    }
  }

  return (
    <Box>
      <Paper className="glass" sx={{ padding: 3, marginBottom: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5">Upload a PCAP</Typography>
          <Typography variant="body2" color="text.secondary">
            Files are stored locally and analyzed by the worker service.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <Button variant="contained" onClick={onUpload} disabled={!file || uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload & Analyze'}
            </Button>
          </Stack>
          {uploadMutation.isPending && <LinearProgress />}
        </Stack>
      </Paper>

      <Typography variant="h5" sx={{ marginBottom: 2 }}>
        Recent Captures
      </Typography>
      {isLoading && <CircularProgress />}
      <Grid container spacing={2}>
        {pcaps?.map((pcap: any) => (
          <Grid item xs={12} md={6} lg={4} key={pcap.id}>
            <PcapCard pcap={pcap} />
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
