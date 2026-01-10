import { Menu, Moon, SunMedium, Upload, Bug, Network } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useThemeMode } from '../lib/theme-state'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { ReactNode, useState } from 'react'
import { auth } from '../lib/auth'

type NavItem = { label: string; to: string; icon: ReactNode }

const navItems: NavItem[] = [
  { label: 'Captures', to: '/pcaps', icon: <Upload size={16} /> },
  { label: 'Issues', to: '/issues', icon: <Bug size={16} /> },
  { label: 'Flows', to: '/pcaps', icon: <Network size={16} /> }
]

export function Shell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [theme, , toggleTheme] = useThemeMode()
  const [open, setOpen] = useState(false)

  const logout = () => {
    auth.clearToken()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside
        className={cn(
          'hidden md:flex w-56 shrink-0 border-r border-border flex-col bg-card/70 backdrop-blur',
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
        <nav className="flex-1 px-2 py-4 space-y-1">
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
