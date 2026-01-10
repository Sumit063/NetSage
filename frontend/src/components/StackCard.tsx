import { ReactNode } from 'react'
import { cn } from '../lib/utils'

export function StackCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('border border-border bg-card rounded-md shadow-sm p-3', className)}>
      {children}
    </div>
  )
}
