import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Page } from '../components/Page'
import { StackCard } from '../components/StackCard'
import { SectionHeader } from '../components/SectionHeader'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { PacketsTab } from '../components/packets/PacketsTab'

export default function PacketsPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: job } = useQuery({
    queryKey: ['job', id],
    queryFn: () => api.getJob(id!),
    enabled: !!id
  })
  const pcapId = job?.pcap_id

  const { data: pcap } = useQuery({
    queryKey: ['pcap', pcapId],
    queryFn: () => api.getPcap(String(pcapId)),
    enabled: !!pcapId
  })

  return (
    <Page>
      <div className="space-y-4">
        <StackCard>
          <SectionHeader
            title="Packets"
            subtitle={pcap ? `Capture: ${pcap.filename}` : 'Packet list with stream details.'}
          >
            <div className="flex flex-wrap items-center gap-2">
              {id ? <Badge variant="low">Job {id}</Badge> : null}
              {pcapId ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/pcaps/${pcapId}`}>Capture Overview</Link>
                </Button>
              ) : null}
              {id ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/jobs/${id}/triage`}>Triage</Link>
                </Button>
              ) : null}
            </div>
          </SectionHeader>
        </StackCard>

        {id ? (
          <PacketsTab jobId={id} searchParams={searchParams} setSearchParams={setSearchParams} />
        ) : (
          <div className="text-xs text-muted-foreground">Missing job id.</div>
        )}
      </div>
    </Page>
  )
}
