import { StackCard } from './StackCard'
import { SeverityBadge } from './IssueSeverity'
import { cn } from '../lib/utils'

type IssueCardProps = {
  issue: any
  selected?: boolean
  showSummary?: boolean
  showEndpoint?: boolean
  showStream?: boolean
  onSelect?: (issue: any) => void
  onStreamClick?: (streamId: number) => void
}

export function IssueCard({
  issue,
  selected,
  showSummary = true,
  showEndpoint = true,
  showStream = true,
  onSelect,
  onStreamClick
}: IssueCardProps) {
  const endpoint = issue?.primary_flow
    ? `${issue.primary_flow.client_ip}:${issue.primary_flow.client_port} → ${issue.primary_flow.server_ip}:${issue.primary_flow.server_port}`
    : null
  const streamId = issue?.primary_flow?.tcp_stream

  return (
    <StackCard
      className={cn(
        'cursor-pointer hover:border-primary/60 transition-colors',
        selected ? 'border-primary/70' : 'border-border'
      )}
      onClick={() => onSelect?.(issue)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{issue.title}</div>
        <SeverityBadge value={issue.severity} />
      </div>
      <div className="text-xs text-muted-foreground">{issue.issue_type}</div>
      {showEndpoint && endpoint ? (
        <div className="text-xs font-mono text-muted-foreground mt-1">{endpoint}</div>
      ) : null}
      {showStream && typeof streamId === 'number' ? (
        <button
          type="button"
          className="text-xs text-primary mt-1"
          onClick={(event) => {
            event.stopPropagation()
            onStreamClick?.(streamId)
          }}
        >
          Stream {streamId}
        </button>
      ) : null}
      {showSummary && issue.summary ? (
        <div className="text-xs text-muted-foreground mt-1">{issue.summary}</div>
      ) : null}
    </StackCard>
  )
}
