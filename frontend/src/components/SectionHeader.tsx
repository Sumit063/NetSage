import { PropsWithChildren } from 'react'
import { cn } from '../lib/utils'

type SectionHeaderProps = PropsWithChildren<{
  title: string
  subtitle?: string
  className?: string
}>

export function SectionHeader({ title, subtitle, children, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col md:flex-row gap-2 md:items-center', className)}>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      <div className="flex-1" />
      {children}
    </div>
  )
}
