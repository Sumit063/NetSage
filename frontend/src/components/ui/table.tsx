import * as React from 'react'
import { cn } from '../../lib/utils'

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto scroll-sharp">
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  )
}

export function Thead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-secondary/40 sticky top-0 z-10" {...props} />
}

export function Tbody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />
}

export function Tr(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className="border-b border-border hover:bg-secondary/30" {...props} />
}

export function Th(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className="text-left px-4 py-3 font-medium text-foreground/80 border-b border-border" {...props} />
}

export function Td(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className="px-4 py-3 align-middle text-foreground/90" {...props} />
}
