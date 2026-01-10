import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { auth } from '../lib/auth'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Tabs } from '../components/ui/tabs'
import { Panel } from '../components/Panel'
import { Page } from '../components/Page'
import { Badge } from '../components/ui/badge'

export default function AuthPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async () => {
    setError('')
    try {
      const data = tab === 'login' ? await api.login(email, password) : await api.register(email, password)
      auth.setToken(data.token)
      navigate('/pcaps')
    } catch (err: any) {
      setError(err.message || 'Auth failed')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <Page>
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          <Panel className="p-6">
            <div className="space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Welcome</div>
                <div className="text-3xl font-semibold">NetSage</div>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-assisted packet intelligence for SREs. Diagnose latency, TLS failures, and MTU issues quickly.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge>Flow Reconstruction</Badge>
                <Badge>TLS Diagnostics</Badge>
                <Badge>AI Explain</Badge>
              </div>
              <div className="border border-border rounded-md p-4 bg-secondary/30">
                <div className="text-sm font-medium">Minimal, sharp dashboard</div>
                <p className="text-xs text-muted-foreground">
                  Crisp panels, dense tables, and monospace accents for technical clarity.
                </p>
              </div>
            </div>
          </Panel>
          <Panel className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xl font-semibold">Access Console</div>
              </div>
              <Tabs
                value={tab}
                onValueChange={(v) => setTab(v as 'login' | 'register')}
                tabs={[
                  { value: 'login', label: 'Login' },
                  { value: 'register', label: 'Register' }
                ]}
              />
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <p className="text-[11px] text-muted-foreground">Use at least 8 characters.</p>
                </div>
                {error && <div className="text-xs text-red-400">{error}</div>}
                <Button className="w-full" onClick={onSubmit}>
                  {tab === 'login' ? 'Login' : 'Create Account'}
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </Page>
    </div>
  )
}
