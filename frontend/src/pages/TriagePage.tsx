import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { api } from '../lib/api'
import { Page } from '../components/Page'
import { Panel } from '../components/Panel'
import { SectionHeader } from '../components/SectionHeader'
import { StackCard } from '../components/StackCard'
import { IssueCard } from '../components/IssueCard'
import { SeverityIcon, severityLabel, severityVariant } from '../components/IssueSeverity'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Skeleton } from '../components/ui/skeleton'
import { DetailGrid, DetailItem } from '../components/DetailFields'
import { DataTable, DataTableColumn } from '../components/DataTable'
import { AnimatedDialog } from '../components/AnimatedDialog'

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

export default function TriagePage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialIssue = searchParams.get('issue')
  const initialStream = searchParams.get('stream') || ''
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(initialIssue)
  const [explanation, setExplanation] = useState<any | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainOpen, setExplainOpen] = useState(false)

  const [issueTypeFilter, setIssueTypeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [serverFilter, setServerFilter] = useState('')
  const [portFilter, setPortFilter] = useState('')
  const [streamFilter, setStreamFilter] = useState(initialStream)

  const updateStreamFilter = (value: string) => {
    setStreamFilter(value)
    setSearchParams((params) => {
      if (value) {
        params.set('stream', value)
      } else {
        params.delete('stream')
      }
      return params
    })
  }

  const flowQueryParams = useMemo(() => {
    const params: Record<string, string | number> = {}
    const client = clientFilter.trim()
    if (client) params.client_ip = client
    const server = serverFilter.trim()
    if (server) params.server_ip = server
    const port = Number(portFilter.trim())
    if (portFilter.trim() && !Number.isNaN(port)) {
      params.port = port
    }
    const stream = Number(streamFilter.trim())
    if (streamFilter.trim() && !Number.isNaN(stream)) {
      params.tcp_stream = stream
    }
    if (Object.keys(params).length > 0) {
      params.limit = 500
    }
    return params
  }, [clientFilter, serverFilter, portFilter, streamFilter])

  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: ['jobIssues', id],
    queryFn: () => api.listJobIssues(id!),
    enabled: !!id
  })

  const { data: flows, isLoading: flowsLoading } = useQuery({
    queryKey: ['jobFlows', id, flowQueryParams],
    queryFn: () => api.listJobFlows(id!, flowQueryParams),
    enabled: !!id
  })

  const { data: issueDetail } = useQuery({
    queryKey: ['issueDetail', selectedIssueId],
    queryFn: () => api.getIssue(selectedIssueId!),
    enabled: !!selectedIssueId
  })

  const issueTypes = useMemo(() => {
    if (!issues) return []
    return Array.from(new Set(issues.map((issue: any) => issue.issue_type))).sort()
  }, [issues])

  const filteredIssues = useMemo(() => {
    if (!issues) return []
    let items = issues
    if (issueTypeFilter || severityFilter) {
      items = items.filter((issue: any) => {
        if (issueTypeFilter && issue.issue_type !== issueTypeFilter) return false
        if (severityFilter && severityLabel(issue.severity) !== severityFilter) return false
        return true
      })
    }
    if (streamFilter) {
      if (!flows) {
        return []
      }
      const flowIDs = new Set(flows.map((flow: any) => flow.id))
      items = items.filter((issue: any) => issue.primary_flow_id && flowIDs.has(issue.primary_flow_id))
    }
    return items
  }, [issues, issueTypeFilter, severityFilter, streamFilter, flows])

  const issueSeverityByFlow = useMemo(() => {
    const map = new Map<number, number>()
    if (!issues) return map
    issues.forEach((issue: any) => {
      if (!issue.primary_flow_id) return
      const current = map.get(issue.primary_flow_id) || 0
      if (issue.severity > current) {
        map.set(issue.primary_flow_id, issue.severity)
      }
    })
    return map
  }, [issues])

  const filteredFlows = useMemo(() => {
    if (!flows) return []
    let items = flows
    if (issueTypeFilter || severityFilter) {
      const issueFlowIDs = new Set(
        (issues || [])
          .filter((issue: any) => {
            if (issueTypeFilter && issue.issue_type !== issueTypeFilter) return false
            if (severityFilter && severityLabel(issue.severity) !== severityFilter) return false
            return true
          })
          .map((issue: any) => issue.primary_flow_id)
          .filter(Boolean)
      )
      items = items.filter((flow: any) => issueFlowIDs.has(flow.id))
    }
    return items
  }, [flows, issues, issueTypeFilter, severityFilter])

  const selectedIssue = issues?.find((issue: any) => String(issue.id) === String(selectedIssueId))
  const evidence = issueDetail?.evidence || []
  const metrics = evidence.length > 0 ? evidence[0].metrics || {} : {}
  const metricItems = Object.entries(metrics).map(([key, value]) => ({
    label: key,
    value: String(value)
  })) as DetailItem[]

  const explain = async () => {
    if (!selectedIssueId) return
    setExplainLoading(true)
    setExplainOpen(true)
    setExplanation(null)
    try {
      const data = await api.explainIssue(String(selectedIssueId))
      setExplanation(data)
    } catch (err) {
      setExplanation({ response: { explanation: 'Failed to generate explanation.', possible_causes: [], next_steps: [] }, shared: {} })
    } finally {
      setExplainLoading(false)
    }
  }

  const handleSelectIssue = (issueId: string) => {
    setSelectedIssueId(issueId)
    setSearchParams((params) => {
      params.set('issue', issueId)
      return params
    })
    setExplanation(null)
  }

  const handleStreamClick = (streamId: number) => {
    updateStreamFilter(String(streamId))
  }

  return (
    <Page>
      <div className="space-y-4">
        <StackCard>
          <SectionHeader title="Triage" subtitle="Deterministic issue list with evidence and related flows.">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Job</span>
              <Badge variant="low">{id}</Badge>
              {streamFilter ? (
                <Badge variant="low" className="flex items-center gap-1">
                  Stream {streamFilter}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => updateStreamFilter('')}
                    aria-label="Clear stream filter"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              ) : null}
            </div>
          </SectionHeader>
        </StackCard>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,40%)_minmax(0,60%)] gap-4 items-stretch">
          <StackCard className="flex flex-col lg:min-h-[560px] lg:h-[70vh]">
            <div className="text-sm font-semibold mb-2">Issue List</div>
            <div className="space-y-2 overflow-auto scroll-sharp flex-1 pr-1">
              {issuesLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : filteredIssues.length ? (
                filteredIssues.map((issue: any) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    selected={String(issue.id) === String(selectedIssueId)}
                    onSelect={(selected) => handleSelectIssue(String(selected.id))}
                    onStreamClick={handleStreamClick}
                  />
                ))
              ) : (
                <div className="text-xs text-muted-foreground">No issues found for this job.</div>
              )}
            </div>
          </StackCard>

          <StackCard className="flex flex-col lg:min-h-[560px] lg:h-[70vh]">
            <div className="text-sm font-semibold mb-2">Issue Detail</div>
            {selectedIssue ? (
              <div className="space-y-4 text-sm flex-1 overflow-auto pr-1">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-base font-semibold">{selectedIssue.title}</div>
                    <Badge variant={severityVariant(selectedIssue.severity)}>{severityLabel(selectedIssue.severity)}</Badge>
                    <Badge variant="low">{selectedIssue.issue_type}</Badge>
                  </div>
                  <div className="text-muted-foreground mt-1">{selectedIssue.summary}</div>
                </div>

                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-2">Evidence</div>
                  <div className="space-y-2">
                    {evidence.map((ev: any, idx: number) => (
                      <Panel key={idx} className="p-3">
                        <div className="text-xs text-muted-foreground">
                          Packets {ev.packet_start_index}–{ev.packet_end_index}
                        </div>
                        {ev.flow ? (
                          <div className="text-xs font-mono text-muted-foreground mt-1">
                            {ev.flow.client_ip}:{ev.flow.client_port} → {ev.flow.server_ip}:{ev.flow.server_port}
                          </div>
                        ) : null}
                        {typeof ev.flow?.tcp_stream === 'number' ? (
                          <button
                            type="button"
                            className="text-xs text-primary mt-1"
                            onClick={() => handleStreamClick(ev.flow.tcp_stream)}
                          >
                            Stream {ev.flow.tcp_stream}
                          </button>
                        ) : null}
                      </Panel>
                    ))}
                    {!evidence.length && (
                      <div className="text-xs text-muted-foreground">No evidence recorded.</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-2">Metrics Snapshot</div>
                  {Object.keys(metrics).length ? (
                    <DetailGrid items={metricItems} className="text-xs" />
                  ) : (
                    <div className="text-xs text-muted-foreground">No metrics captured.</div>
                  )}
                </div>

                <div className="border border-border rounded-md p-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">AI Explanation (Derived from computed metrics)</div>
                    <div className="text-xs text-muted-foreground mt-1">Opens a modal with the explanation and shared data.</div>
                  </div>
                  <Button size="sm" onClick={explain} disabled={explainLoading}>
                    {explainLoading ? 'Generating...' : 'Explain'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Select an issue to inspect evidence.</div>
            )}
          </StackCard>
        </div>

        <StackCard>
          <SectionHeader title="Flows" subtitle="Filter flows by issue type, severity, or endpoints.">
            <div className="flex flex-wrap gap-2">
              <Select value={issueTypeFilter} onChange={(e) => setIssueTypeFilter(String(e.target.value))}>
                <option value="">Issue type</option>
                {issueTypes.map((typ) => (
                  <option key={typ} value={typ}>
                    {typ}
                  </option>
                ))}
              </Select>
              <Select value={severityFilter} onChange={(e) => setSeverityFilter(String(e.target.value))}>
                <option value="">Severity</option>
                <option value="HIGH">HIGH</option>
                <option value="MED">MED</option>
                <option value="LOW">LOW</option>
              </Select>
              <Input placeholder="Client IP" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} />
              <Input placeholder="Server IP" value={serverFilter} onChange={(e) => setServerFilter(e.target.value)} />
              <Input placeholder="Port" value={portFilter} onChange={(e) => setPortFilter(e.target.value)} className="w-24" />
              <Input placeholder="TCP stream" value={streamFilter} onChange={(e) => updateStreamFilter(e.target.value)} className="w-28" />
            </div>
          </SectionHeader>
          {flowsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="mt-3">
              <DataTable
                data={filteredFlows}
                emptyLabel="No matching flows."
                tableClassName="min-w-[980px]"
                columns={
                  [
                    {
                      key: 'issue',
                      header: 'Issue',
                      headerClassName: 'text-center w-16',
                      cellClassName: 'text-center',
                      cell: (flow) => <SeverityIcon value={issueSeverityByFlow.get(flow.id)} />
                    },
                    {
                      key: 'endpoint',
                      header: 'Endpoint',
                      cellClassName: 'font-mono text-xs text-muted-foreground',
                      cell: (flow) => (
                        <>
                          {flow.client_ip}:{flow.client_port} → {flow.server_ip}:{flow.server_port}
                        </>
                      )
                    },
                    {
                      key: 'protocol',
                      header: 'Protocol',
                      headerClassName: 'text-center',
                      cellClassName: 'text-center',
                      cell: (flow) => flow.protocol
                    },
                    {
                      key: 'stream',
                      header: 'TCP Stream',
                      headerClassName: 'text-center',
                      cellClassName: 'text-center',
                      cell: (flow) =>
                        typeof flow.tcp_stream === 'number' ? (
                          <button type="button" className="text-primary text-xs" onClick={() => handleStreamClick(flow.tcp_stream)}>
                            {flow.tcp_stream}
                          </button>
                        ) : (
                          '—'
                        )
                    },
                    {
                      key: 'rtt',
                      header: 'RTT (ms)',
                      headerClassName: 'text-center',
                      cellClassName: 'text-center',
                      cell: (flow) =>
                        typeof flow.handshake_rtt_ms_estimate === 'number' ? flow.handshake_rtt_ms_estimate.toFixed(1) : 'n/a'
                    },
                    {
                      key: 'retrans',
                      header: 'Retrans',
                      headerClassName: 'text-center',
                      cellClassName: 'text-center',
                      cell: (flow) => flow.tcp_retransmissions
                    },
                    {
                      key: 'duration',
                      header: 'Duration (ms)',
                      headerClassName: 'text-center',
                      cellClassName: 'text-center',
                      cell: (flow) => (typeof flow.duration_ms === 'number' ? Math.round(flow.duration_ms) : 'n/a')
                    },
                    {
                      key: 'actions',
                      header: 'Actions',
                      headerClassName: 'text-right',
                      cellClassName: 'text-right',
                      cell: (flow) => (
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/flows/${flow.id}`}>Inspect</Link>
                        </Button>
                      )
                    }
                  ] as DataTableColumn<any>[]
                }
              />
            </div>
          )}
        </StackCard>
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
              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(explanation.shared, null, 2)}</pre>
            ) : (
              <div className="text-sm text-muted-foreground">No data shared.</div>
            )}
          </div>
        </div>
      </AnimatedDialog>
    </Page>
  )
}
