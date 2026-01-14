import * as React from 'react'
import { cn } from '../../lib/utils'

type TabsProps = {
  value: string
  onValueChange: (val: string) => void
  tabs: { value: string; label: string; disabled?: boolean }[]
  className?: string
}

export function Tabs({ value, onValueChange, tabs, className }: TabsProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          disabled={tab.disabled}
          className={cn(
            'px-3 py-1.5 rounded-md border',
            value === tab.value
              ? 'border-primary text-primary bg-primary/10'
              : 'border-border text-foreground/80 hover:bg-secondary/30',
            tab.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
          )}
          onClick={() => onValueChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
