import { ReactNode } from 'react'
import { cn } from '../lib/utils'

export type DetailItem = {
  label: string
  value: ReactNode
  span?: 2
  valueClassName?: string
}

type DetailGridProps = {
  items: DetailItem[]
  className?: string
}

type DetailListProps = {
  items: DetailItem[]
  className?: string
}

export function DetailGrid({ items, className }: DetailGridProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-2 text-sm', className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'flex items-center justify-between rounded-md border border-border/60 px-2 py-1.5',
            item.span === 2 && 'md:col-span-2'
          )}
        >
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</span>
          <span className={cn('font-mono text-[11px] text-right', item.valueClassName)}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export function DetailList({ items, className }: DetailListProps) {
  return (
    <div className={cn('grid gap-2 text-sm', className)}>
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</div>
          <div className={cn('font-mono text-[11px] text-right', item.valueClassName)}>{item.value}</div>
        </div>
      ))}
    </div>
  )
}
