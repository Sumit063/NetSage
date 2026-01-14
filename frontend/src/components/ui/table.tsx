import * as React from 'react'
import { cn } from '../../lib/utils'

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto scroll-sharp">
      <table className={cn('w-full border-collapse text-sm text-foreground', className)} {...props} />
    </div>
  )
}

export function Thead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-secondary/30 sticky top-0 z-10 backdrop-blur" {...props} />
}

export function Tbody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />
}

export function Tr(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className="border-b border-border hover:bg-secondary/20 transition-colors" {...props} />
}

export function Th(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className="text-left px-4 py-2.5 text-xs uppercase tracking-wide font-semibold text-muted-foreground border-b border-border"
      {...props}
    />
  )
}

export function Td(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className="px-4 py-2.5 align-middle text-sm text-foreground/90" {...props} />
}
