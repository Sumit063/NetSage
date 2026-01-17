export function formatBytes(value: number): string {
  if (!value) return '0 B'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function formatDurationMs(value?: number | null): string {
  if (value === undefined || value === null) return 'n/a'
  if (value < 1000) return `${Math.round(value)} ms`
  return `${(value / 1000).toFixed(2)} s`
}

export function formatRelativeTime(ts: string, base?: string): string {
  if (!ts || !base) return '0.000s'
  const baseMs = new Date(base).getTime()
  const tsMs = new Date(ts).getTime()
  if (Number.isNaN(baseMs) || Number.isNaN(tsMs)) return 'n/a'
  return `${((tsMs - baseMs) / 1000).toFixed(3)}s`
}
