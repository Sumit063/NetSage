import { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type ClickableCellProps = {
  children: ReactNode
  onClick: () => void
  ariaLabel: string
  className?: string
}

export function ClickableCell({ children, onClick, ariaLabel, className }: ClickableCellProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition cursor-pointer',
        'text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
        className
      )}
    >
      {children}
    </button>
  )
}
