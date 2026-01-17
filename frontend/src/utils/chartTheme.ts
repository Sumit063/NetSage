export const chartAxisTick = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
export const chartAxisLabel = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }

export const chartTooltip = {
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    boxShadow: '0 8px 16px rgba(0,0,0,0.18)'
  },
  labelStyle: { color: 'hsl(var(--foreground))', fontSize: 11 },
  itemStyle: { color: 'hsl(var(--foreground))', fontSize: 11 },
  cursor: { stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3 3' },
  wrapperStyle: { zIndex: 5 }
}

export function createRelativeTimeFormatter(baseTs?: string) {
  return (ts: string) => {
    if (!baseTs) return ''
    const delta = (new Date(ts).getTime() - new Date(baseTs).getTime()) / 1000
    return `${Math.max(0, Math.round(delta))}s`
  }
}
