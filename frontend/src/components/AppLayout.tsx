import { PropsWithChildren } from 'react'
import { Box, Button, Divider, Paper, Stack, Typography } from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { auth } from '../lib/auth'

export function AppLayout({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: api.me })

  const onLogout = () => {
    auth.clearToken()
    navigate('/login')
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', padding: { xs: 2, md: 4 }, gap: 2 }}>
      <Paper
        className="glass"
        sx={{
          width: 240,
          padding: 3,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          gap: 2
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          NetSage
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Packet & Flow Intelligence
        </Typography>
        <Divider sx={{ my: 1 }} />
        <Stack spacing={1}>
          <Button component={Link} to="/pcaps" variant="outlined">
            Upload & Jobs
          </Button>
          <Button component={Link} to="/issues" variant="outlined">
            Issues
          </Button>
        </Stack>
        <Box sx={{ flexGrow: 1 }} />
        <Divider sx={{ my: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {me?.email || 'Analyst'}
        </Typography>
        <Button onClick={onLogout} color="secondary" variant="contained">
          Logout
        </Button>
      </Paper>

      <Box sx={{ flex: 1 }}>
        <Paper className="glass" sx={{ padding: { xs: 2, md: 3 }, marginBottom: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Box>
              <Typography variant="h4">NetSage</Typography>
              <Typography variant="body2" color="text.secondary">
                AI-assisted packet diagnostics and flow intelligence
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <Stack direction="row" spacing={1}>
              <Button component={Link} to="/issues" variant="outlined">
                Issues
              </Button>
              <Button component={Link} to="/pcaps" variant="contained">
                New Upload
              </Button>
            </Stack>
          </Stack>
        </Paper>
        <Box className="page">{children}</Box>
      </Box>
    </Box>
  )
}
