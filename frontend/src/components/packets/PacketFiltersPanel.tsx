import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { PacketFilters } from '../../utils/filters'
import { cn } from '../../lib/utils'

const FLAG_OPTIONS = ['SYN', 'ACK', 'FIN', 'RST', 'PSH', 'URG'] as const

type PacketFiltersPanelProps = {
  draft: PacketFilters
  onChange: (next: PacketFilters) => void
  onApply: () => void
  onReset: () => void
}

export function PacketFiltersPanel({ draft, onChange, onApply, onReset }: PacketFiltersPanelProps) {
  const isTcp = draft.proto === 'TCP'
  const flags = draft.flags || []

  const toggleFlag = (flag: (typeof FLAG_OPTIONS)[number]) => {
    if (!isTcp) return
    const next = flags.includes(flag) ? flags.filter((item) => item !== flag) : [...flags, flag]
    onChange({ ...draft, flags: next.length ? next : undefined })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
        <Input
          placeholder="Source IP"
          value={draft.srcIp || ''}
          onChange={(e) => onChange({ ...draft, srcIp: e.target.value || undefined })}
        />
        <Input
          placeholder="Destination IP"
          value={draft.dstIp || ''}
          onChange={(e) => onChange({ ...draft, dstIp: e.target.value || undefined })}
        />
        <Input
          placeholder="Source Port"
          value={draft.srcPort || ''}
          onChange={(e) => onChange({ ...draft, srcPort: e.target.value || undefined })}
        />
        <Input
          placeholder="Destination Port"
          value={draft.dstPort || ''}
          onChange={(e) => onChange({ ...draft, dstPort: e.target.value || undefined })}
        />
        <Select
          value={draft.proto || ''}
          onChange={(e) => {
            const value = e.target.value || undefined
            onChange({ ...draft, proto: value as 'TCP' | 'UDP' | undefined, flags: value === 'TCP' ? draft.flags : undefined })
          }}
        >
          <option value="">Any Protocol</option>
          <option value="TCP">TCP</option>
          <option value="UDP">UDP</option>
        </Select>
        <Input
          placeholder="TCP Stream #"
          value={draft.stream || ''}
          onChange={(e) => onChange({ ...draft, stream: e.target.value || undefined })}
        />
      </div>

      <div>
        <div className="text-xs uppercase text-muted-foreground mb-2">TCP Flags</div>
        <div className="flex flex-wrap gap-2">
          {FLAG_OPTIONS.map((flag) => (
            <button
              key={flag}
              type="button"
              className={cn(
                'px-2.5 py-1 rounded-md border text-xs font-medium transition',
                flags.includes(flag) ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground',
                !isTcp && 'opacity-40 cursor-not-allowed'
              )}
              onClick={() => toggleFlag(flag)}
              disabled={!isTcp}
            >
              {flag}
            </button>
          ))}
          {!isTcp && <span className="text-xs text-muted-foreground ml-1">Enable TCP to apply flags.</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={onApply}>Apply Filters</Button>
        <Button variant="outline" onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  )
}
