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
import { Table, Tbody, Td, Th, Thead, Tr } from '../components/ui/table'
import { Skeleton } from '../components/ui/skeleton'

export default function TriagePage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialIssue = searchParams.get('issue')
  const initialStream = searchParams.get('stream') || ''
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(initialIssue)
  const [explanation, setExplanation] = useState<any | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)

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

  const explain = async () => {
    if (!selectedIssueId) return
    setExplainLoading(true)
    try {
      const data = await api.explainIssue(String(selectedIssueId))
      setExplanation(data)
    } catch (err) {
      setExplanation(null)
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {Object.entries(metrics).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between border border-border rounded-sm px-2 py-1">
                          <span className="text-muted-foreground">{key}</span>
                          <span className="font-mono">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No metrics captured.</div>
                  )}
                </div>

                <div className="border border-border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs uppercase text-muted-foreground">AI Explanation (Derived from computed metrics)</div>
                    <Button size="sm" onClick={explain} disabled={explainLoading}>
                      {explainLoading ? 'Generating...' : 'Explain'}
                    </Button>
                  </div>
                  {explanation?.response ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs uppercase text-muted-foreground">Explanation</div>
                        <div className="text-foreground/90 mt-1">{explanation.response.explanation}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase text-muted-foreground">Possible Causes</div>
                        <ul className="list-disc list-inside text-foreground/90">
                          {(explanation.response.possible_causes || []).map((item: string, idx: number) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs uppercase text-muted-foreground">Next Steps</div>
                        <ul className="list-disc list-inside text-foreground/90">
                          {(explanation.response.next_steps || []).map((item: string, idx: number) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No explanation available.</div>
                  )}
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
              <Table className="min-w-[980px]">
                <Thead>
                  <Tr>
                    <Th className="text-center w-16">Issue</Th>
                    <Th>Endpoint</Th>
                    <Th className="text-center">Protocol</Th>
                    <Th className="text-center">TCP Stream</Th>
                    <Th className="text-center">RTT (ms)</Th>
                    <Th className="text-center">Retrans</Th>
                    <Th className="text-center">Duration (ms)</Th>
                    <Th className="text-right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredFlows.map((flow: any) => {
                    const flowSeverity = issueSeverityByFlow.get(flow.id)
                    return (
                      <Tr key={flow.id}>
                        <Td>
                          <div className="flex items-center justify-center">
                            <SeverityIcon value={flowSeverity} />
                          </div>
                        </Td>
                        <Td className="font-mono text-xs text-muted-foreground">
                          {flow.client_ip}:{flow.client_port} → {flow.server_ip}:{flow.server_port}
                        </Td>
                        <Td className="text-center">{flow.protocol}</Td>
                        <Td className="text-center">
                          {typeof flow.tcp_stream === 'number' ? (
                            <button
                              type="button"
                              className="text-primary text-xs"
                              onClick={() => handleStreamClick(flow.tcp_stream)}
                            >
                              {flow.tcp_stream}
                            </button>
                          ) : '—'}
                        </Td>
                        <Td className="text-center">
                          {typeof flow.handshake_rtt_ms_estimate === 'number' ? flow.handshake_rtt_ms_estimate.toFixed(1) : 'n/a'}
                        </Td>
                        <Td className="text-center">{flow.tcp_retransmissions}</Td>
                        <Td className="text-center">{typeof flow.duration_ms === 'number' ? Math.round(flow.duration_ms) : 'n/a'}</Td>
                        <Td className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/flows/${flow.id}`}>Inspect</Link>
                          </Button>
                        </Td>
                      </Tr>
                    )
                  })}
                  {!filteredFlows.length && (
                    <Tr>
                      <Td colSpan={8} className="text-center text-muted-foreground">
                        No matching flows.
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </div>
          )}
        </StackCard>
      </div>
    </Page>
  )
}
