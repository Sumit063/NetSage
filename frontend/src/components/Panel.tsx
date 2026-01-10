import { cn } from '../lib/utils'
import { ReactNode } from 'react'

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('border border-border bg-card rounded-md shadow-sm', className)}>{children}</div>
}
