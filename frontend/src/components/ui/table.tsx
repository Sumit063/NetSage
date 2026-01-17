import * as React from 'react'
import { cn } from '../../lib/utils'

type TableProps = React.HTMLAttributes<HTMLTableElement> & {
  containerClassName?: string
}

export function Table({ className, containerClassName, ...props }: TableProps) {
  return (
    <div className={cn('w-full overflow-x-auto scroll-sharp', containerClassName)}>
      <table className={cn('w-full border-collapse text-sm text-foreground', className)} {...props} />
    </div>
  )
}

export function Thead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-secondary/30 sticky top-0 z-10 backdrop-blur', className)} {...props} />
}

export function Tbody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn(className)} {...props} />
}

export function Tr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-border hover:bg-secondary/20 transition-colors', className)} {...props} />
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'text-left px-4 py-2.5 text-xs uppercase tracking-wide font-semibold text-muted-foreground border-b border-border',
        className
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-2.5 align-middle text-sm text-foreground/90', className)} {...props} />
}
