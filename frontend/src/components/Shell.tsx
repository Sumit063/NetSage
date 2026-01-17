import { AlertTriangle, ArrowLeft, LayoutDashboard, List, Menu, Moon, SunMedium, Upload } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useThemeMode } from '../lib/theme-state'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { ReactNode, useState } from 'react'
import { auth } from '../lib/auth'
import { api } from '../lib/api'

type NavItem = { label: string; to: string; icon: ReactNode; disabled?: boolean }
const navItems: NavItem[] = [
  { label: 'Captures', to: '/pcaps', icon: <Upload size={16} /> }
]

export function Shell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [theme, , toggleTheme] = useThemeMode()
  const [open, setOpen] = useState(false)

  const segments = location.pathname.split('/').filter(Boolean)
  const pcapIdFromPath = segments[0] === 'pcaps' ? segments[1] : undefined
  const jobIdFromPath = segments[0] === 'jobs' ? segments[1] : undefined

  const { data: job } = useQuery({
    queryKey: ['job', jobIdFromPath],
    queryFn: () => api.getJob(jobIdFromPath!),
    enabled: !!jobIdFromPath
  })

  const { data: jobs } = useQuery({
    queryKey: ['jobs', pcapIdFromPath],
    queryFn: () => api.listJobs(String(pcapIdFromPath)),
    enabled: !!pcapIdFromPath && !jobIdFromPath
  })

  const latestJobId = jobIdFromPath || (jobs && jobs.length > 0 ? String(jobs[0].id) : undefined)
  const pcapId = pcapIdFromPath || (job?.pcap_id ? String(job.pcap_id) : undefined)
  const viewerNavItems: NavItem[] = pcapId
    ? [
        { label: 'Overview', to: `/pcaps/${pcapId}`, icon: <LayoutDashboard size={16} /> },
        { label: 'Packets', to: latestJobId ? `/jobs/${latestJobId}/packets` : '#', icon: <List size={16} />, disabled: !latestJobId },
        { label: 'Triage', to: latestJobId ? `/jobs/${latestJobId}/triage` : '#', icon: <AlertTriangle size={16} />, disabled: !latestJobId }
      ]
    : []

  const logout = () => {
    auth.clearToken()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside
        className={cn(
          'hidden md:flex w-56 shrink-0 border-r border-border flex-col bg-card/70 backdrop-blur md:sticky md:top-0 md:h-screen md:overflow-hidden',
          open && 'block'
        )}
      >
        <div className="px-4 py-4 border-b border-border">
          <Link to="/pcaps" className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-8 w-8 bg-primary/20 border border-primary rounded-sm inline-flex items-center justify-center text-primary font-mono">
              NS
            </span>
            NetSage
          </Link>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-hidden">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-3 mb-2">Workspace</div>
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm rounded-md border',
                  active ? 'border-primary text-primary bg-primary/10' : 'border-transparent hover:border-border'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
          {viewerNavItems.length ? (
            <div className="pt-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-3 mb-2">Viewer</div>
              {viewerNavItems.map((item) => {
                const active = location.pathname.startsWith(item.to)
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    aria-disabled={item.disabled}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm rounded-md border',
                      active ? 'border-primary text-primary bg-primary/10' : 'border-transparent hover:border-border',
                      item.disabled && 'opacity-50 pointer-events-none'
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ) : null}
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="outline" className="w-full justify-center" onClick={logout}>
            Logout
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-border flex items-center px-3 md:px-6 gap-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((o) => !o)}>
            <Menu size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={16} />
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">NetSage</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">Dashboard</span>
          </div>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <SunMedium size={16} /> : <Moon size={16} />}
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
