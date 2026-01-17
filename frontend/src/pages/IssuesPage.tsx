import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useSearchParams } from 'react-router-dom'
import { Page } from '../components/Page'
import { SectionHeader } from '../components/SectionHeader'
import { StackCard } from '../components/StackCard'
import { IssueCard } from '../components/IssueCard'
import { AnimatedDialog } from '../components/AnimatedDialog'
import { Button } from '../components/ui/button'
import { Select } from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { severityLabel } from '../components/IssueSeverity'

function renderExplanation(exp: any) {
  if (!exp) {
    return <div className="text-sm text-muted-foreground">No explanation yet.</div>
  }
  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="text-xs uppercase text-muted-foreground">Explanation</div>
        <div className="mt-1 text-foreground/90">{exp.explanation || 'n/a'}</div>
      </div>
      <div>
        <div className="text-xs uppercase text-muted-foreground">Possible Causes</div>
        <ul className="list-disc list-inside text-foreground/90">
          {(exp.possible_causes || []).map((item: string, idx: number) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-xs uppercase text-muted-foreground">Next Steps</div>
        <ul className="list-disc list-inside text-foreground/90">
          {(exp.next_steps || []).map((item: string, idx: number) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function IssuesPage() {
  const [searchParams] = useSearchParams()
  const initialPcap = searchParams.get('pcap') || ''
  const initialIssue = searchParams.get('issue') || ''
  const { data: pcaps } = useQuery({ queryKey: ['pcaps'], queryFn: api.listPcaps })
  const [selectedPcap, setSelectedPcap] = useState<string>(initialPcap)
  const [severity, setSeverity] = useState<string>('')
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null)
  const [explanation, setExplanation] = useState<any | null>(null)
  const [explainOpen, setExplainOpen] = useState(false)
  const [explainLoading, setExplainLoading] = useState(false)

  const { data: issues } = useQuery({
    queryKey: ['issues', selectedPcap],
    queryFn: () => api.listIssues(selectedPcap),
    enabled: !!selectedPcap
  })

  useEffect(() => {
    if (issues && initialIssue) {
      const match = issues.find((issue: any) => String(issue.id) === initialIssue)
      if (match) {
        setSelectedIssue(match)
      }
    }
  }, [issues, initialIssue])

  useEffect(() => {
    setSelectedIssue(null)
    setExplanation(null)
    setExplainOpen(false)
  }, [selectedPcap, severity])

  const filtered = useMemo(() => {
    if (!issues) return []
    return issues.filter((issue: any) => {
      if (!severity) return true
      const label = severityLabel(issue.severity)
      return label === severity
    })
  }, [issues, severity])

  const explain = async () => {
    if (!selectedIssue) return
    setExplainOpen(true)
    setExplainLoading(true)
    try {
      const data = await api.explainIssue(String(selectedIssue.id))
      setExplanation(data)
    } catch (err) {
      setExplanation({ response: 'Failed to generate explanation.', shared: {} })
    } finally {
      setExplainLoading(false)
    }
  }

  return (
    <Page>
      <div className="space-y-4">
        <StackCard>
          <SectionHeader title="Issues" subtitle="Filter by severity and ask AI to explain a finding.">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={selectedPcap} onChange={(e) => setSelectedPcap(String(e.target.value))}>
                <option value="">Select PCAP</option>
                {pcaps?.map((pcap: any) => (
                  <option key={pcap.id} value={pcap.id}>
                    {pcap.filename}
                  </option>
                ))}
              </Select>
              <Select value={severity} onChange={(e) => setSeverity(String(e.target.value))}>
                <option value="">All Severities</option>
                <option value="HIGH">HIGH</option>
                <option value="MED">MED</option>
                <option value="LOW">LOW</option>
              </Select>
            </div>
          </SectionHeader>
        </StackCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <StackCard className="lg:col-span-1">
            <div className="text-sm font-semibold mb-2">Filters</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Selected PCAP</span>
                <Badge variant="low">{selectedPcap || 'None'}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Severity</span>
                <Badge variant={severity === 'HIGH' ? 'high' : severity === 'MED' ? 'med' : 'low'}>
                  {severity || 'Any'}
                </Badge>
              </div>
            </div>
          </StackCard>

          <StackCard className="lg:col-span-1">
            <div className="text-sm font-semibold mb-2">Issue List</div>
            <div className="space-y-2 max-h-[420px] overflow-auto scroll-sharp">
              {filtered.map((issue: any) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  selected={selectedIssue?.id === issue.id}
                  showSummary={false}
                  showEndpoint={false}
                  showStream={false}
                  onSelect={(selected) => {
                    setSelectedIssue(selected)
                    setExplanation(null)
                  }}
                />
              ))}
              {!filtered.length && (
                <div className="text-xs text-muted-foreground">Select a PCAP to view issues.</div>
              )}
            </div>
          </StackCard>

          <StackCard className="lg:col-span-1">
            <div className="text-sm font-semibold mb-2">Issue Inspector</div>
            {selectedIssue ? (
              <div className="space-y-2 text-sm">
                <div className="font-semibold">{selectedIssue.title}</div>
                <div className="text-muted-foreground">{selectedIssue.summary}</div>
                <Button size="sm" onClick={explain}>
                  Explain with AI
                </Button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Select an issue to view details.</div>
            )}
          </StackCard>
        </div>
      </div>

      <AnimatedDialog
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        title="AI Explanation (Derived from computed metrics)"
        bodyClassName="overflow-hidden"
        panelClassName="max-w-6xl w-[95vw]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,65%)_minmax(0,35%)] gap-4 h-[70vh]">
          <div className="border border-border rounded-md p-3 overflow-auto">
            <div className="text-xs uppercase text-muted-foreground mb-2">AI Explanation</div>
            {explainLoading ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <span className="text-sm text-muted-foreground">Generating explanation...</span>
              </div>
            ) : explanation ? (
              renderExplanation(explanation.response)
            ) : (
              <div className="text-sm text-muted-foreground">No explanation yet.</div>
            )}
          </div>
          <div className="border border-border rounded-md p-3 overflow-auto">
            <div className="text-xs uppercase text-muted-foreground mb-2">Data Shared to AI</div>
            {explainLoading ? (
              <div className="text-sm text-muted-foreground">Waiting for response...</div>
            ) : explanation ? (
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(explanation.shared, null, 2)}
              </pre>
            ) : (
              <div className="text-sm text-muted-foreground">No data shared.</div>
            )}
          </div>
        </div>
      </AnimatedDialog>
    </Page>
  )
}
