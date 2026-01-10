import * as React from 'react'
import { cn } from '../../lib/utils'

const variants: Record<string, string> = {
  default: 'border border-border text-foreground',
  high: 'border border-red-500 text-red-400',
  med: 'border border-amber-500 text-amber-300',
  low: 'border border-slate-500 text-slate-300'
}

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
