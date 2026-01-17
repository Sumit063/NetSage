import { ReactNode, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { Panel } from '../Panel'
import { Button } from '../ui/button'
import { AnimatedDialog } from '../AnimatedDialog'
import { cn } from '../../lib/utils'

type ExpandableChartPanelProps = {
  title: string
  renderChart: () => ReactNode
  empty?: boolean
  emptyLabel?: string
  heightClassName?: string
  modalHeightClassName?: string
  panelClassName?: string
}

export function ExpandableChartPanel({
  title,
  renderChart,
  empty,
  emptyLabel = 'No data available.',
  heightClassName = 'h-60',
  modalHeightClassName = 'h-[70vh]',
  panelClassName
}: ExpandableChartPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Panel className={cn('p-4', panelClassName)}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">{title}</div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            disabled={!!empty}
            aria-label={`Expand ${title}`}
          >
            <Maximize2 size={14} />
          </Button>
        </div>
        <div className={heightClassName}>
          {empty ? <div className="text-xs text-muted-foreground">{emptyLabel}</div> : renderChart()}
        </div>
      </Panel>

      <AnimatedDialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        bodyClassName="overflow-hidden"
        panelClassName="max-w-6xl w-[95vw]"
      >
        <div className={modalHeightClassName}>
          {empty ? <div className="text-sm text-muted-foreground">{emptyLabel}</div> : renderChart()}
        </div>
      </AnimatedDialog>
    </>
  )
}
