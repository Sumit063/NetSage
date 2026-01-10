import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useDropzone } from 'react-dropzone'
import { Page } from '../components/Page'
import { Panel } from '../components/Panel'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Table, Tbody, Td, Th, Thead, Tr } from '../components/ui/table'
import { Skeleton } from '../components/ui/skeleton'

function PcapCard({ pcap }: { pcap: any }) {
  const { data: jobs } = useQuery({ queryKey: ['jobs', pcap.id], queryFn: () => api.listJobs(String(pcap.id)) })
  const latest = jobs && jobs.length > 0 ? jobs[0] : null

  return (
    <Tr>
      <Td className="font-medium max-w-[320px] truncate" title={pcap.filename}>
        {pcap.filename}
      </Td>
      <Td className="text-muted-foreground">{new Date(pcap.uploaded_at).toLocaleString()}</Td>
      <Td className="text-muted-foreground">
        {latest ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono">{latest.status}</span>
            <div className="h-2 w-24 rounded-sm bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${latest.progress || 0}%` }} />
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Pending analysis</span>
        )}
      </Td>
      <Td className="text-right whitespace-nowrap w-[80px]">
        <Link to={`/pcaps/${pcap.id}`} className="text-primary text-sm underline">
          Open
        </Link>
      </Td>
    </Tr>
  )
}

export default function PcapsPage() {
  const [file, setFile] = useState<File | null>(null)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: pcaps, isLoading } = useQuery({ queryKey: ['pcaps'], queryFn: api.listPcaps })

  const uploadMutation = useMutation({
    mutationFn: (f: File) => api.uploadPcap(f),
    onSuccess: () => {
      setFile(null)
      queryClient.invalidateQueries({ queryKey: ['pcaps'] })
    }
  })

  const onUpload = () => {
    if (file) {
      uploadMutation.mutate(file)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => setFile(accepted[0] || null),
    multiple: false
  })

  const filtered = useMemo(() => {
    if (!pcaps) return []
    return pcaps.filter((p: any) => p.filename.toLowerCase().includes(search.toLowerCase()))
  }, [pcaps, search])

  return (
    <Page>
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel className="p-4 lg:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Upload capture</div>
                <p className="text-xs text-muted-foreground">
                  Drag-and-drop PCAPs; processing is streamed to keep memory low.
                </p>
              </div>
              <Button onClick={onUpload} disabled={!file || uploadMutation.isPending}>
                {uploadMutation.isPending ? 'Uploading...' : 'Queue Analysis'}
              </Button>
            </div>
            <div
              {...getRootProps()}
              className="mt-3 border border-dashed border-border rounded-md px-4 py-6 text-center cursor-pointer hover:border-primary"
            >
              <input {...getInputProps()} />
              <div className="text-sm font-medium">{file ? `Selected: ${file.name}` : 'Drop PCAP or click to browse'}</div>
              <p className="text-xs text-muted-foreground">Supports .pcap files</p>
            </div>
          </Panel>
          <Panel className="p-4">
            <div className="text-sm font-semibold mb-2">Workspace</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Captures</span>
                <span className="font-mono">{pcaps?.length ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="low">Streamed parsing</Badge>
                <Badge variant="med">Per-user isolation</Badge>
              </div>
            </div>
          </Panel>
        </div>

        <Panel className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-sm font-semibold">Captures</div>
            <div className="flex-1" />
            <Input
              placeholder="Search filename"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table className="min-w-[640px]">
              <Thead>
                <Tr>
                  <Th>Filename</Th>
                  <Th>Uploaded</Th>
                  <Th>Status</Th>
                  <Th className="text-right whitespace-nowrap w-[80px]">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map((pcap: any) => (
                  <PcapCard key={pcap.id} pcap={pcap} />
                ))}
                {!filtered.length && (
                  <Tr>
                    <Td colSpan={4} className="text-center text-muted-foreground">
                      No captures yet.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          )}
        </Panel>
      </div>
    </Page>
  )
}
