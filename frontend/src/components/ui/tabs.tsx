import { cn } from '../../lib/utils'

type TabsProps = {
  value: string
  onValueChange: (val: string) => void
  tabs: { value: string; label: string; disabled?: boolean }[]
  className?: string
}

export function Tabs({ value, onValueChange, tabs, className }: TabsProps) {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-md border border-border bg-secondary/30 p-1 text-sm', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          disabled={tab.disabled}
          className={cn(
            'px-4 py-2 rounded-md transition font-medium',
            value === tab.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
            tab.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground'
          )}
          onClick={() => onValueChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
