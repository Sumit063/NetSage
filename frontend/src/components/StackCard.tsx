import { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/utils'

type StackCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

export function StackCard({ children, className, ...props }: StackCardProps) {
  return (
    <div className={cn('border border-border bg-card rounded-md shadow-sm p-3', className)} {...props}>
      {children}
    </div>
  )
}
