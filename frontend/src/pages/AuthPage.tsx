import { useState } from 'react'
import { Box, Button, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { auth } from '../lib/auth'

export default function AuthPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async () => {
    setError('')
    try {
      const data = tab === 0 ? await api.login(email, password) : await api.register(email, password)
      auth.setToken(data.token)
      navigate('/pcaps')
    } catch (err: any) {
      setError(err.message || 'Auth failed')
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 3 }}>
      <Paper className="glass" sx={{ width: 420, padding: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome to NetSage
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Securely analyze packet captures and explain issues with AI.
        </Typography>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ marginBottom: 2 }}>
          <Tab label="Login" />
          <Tab label="Register" />
        </Tabs>
        <Stack spacing={2}>
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="Use at least 8 characters"
            fullWidth
          />
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
          <Button variant="contained" onClick={onSubmit}>
            {tab === 0 ? 'Login' : 'Create Account'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
