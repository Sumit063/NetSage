import { AlertCircle, AlertTriangle, Info, Minus } from 'lucide-react'
import { Badge } from './ui/badge'
import { cn } from '../lib/utils'

export function severityLabel(value?: number) {
  if (!value) return 'n/a'
  if (value >= 4) return 'HIGH'
  if (value >= 2) return 'MED'
  return 'LOW'
}

export function severityVariant(value?: number) {
  if (!value) return 'low'
  if (value >= 4) return 'high'
  if (value >= 2) return 'med'
  return 'low'
}

type SeverityIconProps = {
  value?: number
  size?: number
  className?: string
}

export function SeverityIcon({ value, size = 14, className }: SeverityIconProps) {
  if (!value) return <Minus size={size} className={cn('text-muted-foreground', className)} />
  if (value >= 4) return <AlertTriangle size={size} className={cn('text-red-500', className)} />
  if (value >= 2) return <AlertCircle size={size} className={cn('text-amber-500', className)} />
  return <Info size={size} className={cn('text-emerald-500', className)} />
}

type SeverityBadgeProps = {
  value?: number
  showLabel?: boolean
  className?: string
}

export function SeverityBadge({ value, showLabel = true, className }: SeverityBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <SeverityIcon value={value} />
      {showLabel ? <Badge variant={severityVariant(value)}>{severityLabel(value)}</Badge> : null}
    </span>
  )
}
