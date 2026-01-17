import { X } from 'lucide-react'
import { Badge } from '../ui/badge'
import { PacketFilters, getActiveFilterPills } from '../../utils/filters'

type ActiveFiltersBarProps = {
  filters: PacketFilters
  onRemove: (key: keyof PacketFilters) => void
  onClear: () => void
}

export function ActiveFiltersBar({ filters, onRemove, onClear }: ActiveFiltersBarProps) {
  const pills = getActiveFilterPills(filters)
  if (!pills.length) return null

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {pills.map((pill) => (
        <Badge key={`${pill.key}-${pill.value}`} className="gap-1 bg-secondary/40">
          <span className="text-muted-foreground">{pill.label}:</span>
          <span className="font-mono">{pill.value}</span>
          <button type="button" className="ml-1 text-muted-foreground hover:text-foreground" onClick={() => onRemove(pill.key)}>
            <X size={12} />
          </button>
        </Badge>
      ))}
      <button type="button" className="text-muted-foreground hover:text-foreground" onClick={onClear}>
        Clear all
      </button>
    </div>
  )
}
