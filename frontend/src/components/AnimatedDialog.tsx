import { PropsWithChildren } from 'react'
import { cn } from '../lib/utils'

type AnimatedDialogProps = PropsWithChildren<{
  open: boolean
  title: string
  onClose: () => void
  panelClassName?: string
  bodyClassName?: string
}>

export function AnimatedDialog({ open, title, onClose, children, panelClassName, bodyClassName }: AnimatedDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={cn(
          'w-full max-w-3xl border border-border bg-card rounded-md shadow-lg flex flex-col max-h-[80vh]',
          panelClassName
        )}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="text-sm font-semibold">{title}</div>
          <button
            onClick={onClose}
            className={cn(
              'h-8 w-8 inline-flex items-center justify-center border border-border rounded-sm hover:bg-secondary/50'
            )}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className={cn('p-4 text-sm flex-1 overflow-auto', bodyClassName)}>{children}</div>
      </div>
    </div>
  )
}
