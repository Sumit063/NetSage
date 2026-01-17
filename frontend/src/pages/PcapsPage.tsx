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
import { DataTable } from '../components/DataTable'
import { Skeleton } from '../components/ui/skeleton'
import { ExternalLink, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '../components/ui/confirm-dialog'

function useLatestJob(pcapId: string) {
  const { data: jobs } = useQuery({ queryKey: ['jobs', pcapId], queryFn: () => api.listJobs(String(pcapId)), enabled: !!pcapId })
  return jobs && jobs.length > 0 ? jobs[0] : null
}

function PcapStatusCell({ pcapId }: { pcapId: string }) {
  const latest = useLatestJob(pcapId)
  const progress = latest?.progress ?? 0
  return latest ? (
    <div className="flex items-center gap-3 text-muted-foreground">
      <div className="text-xs font-mono uppercase tracking-wide">{latest.status}</div>
      <div className="h-2 w-32 rounded-sm bg-muted/70 overflow-hidden border border-border">
        <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
      <div className="text-xs font-mono text-muted-foreground w-10 text-right">{Math.round(progress)}%</div>
    </div>
  ) : (
    <span className="text-xs text-muted-foreground">Pending analysis</span>
  )
}

function PcapActionsCell({ pcap, onDelete }: { pcap: any; onDelete: (pcap: any) => void }) {
  const latest = useLatestJob(String(pcap.id))
  return (
    <div className="flex items-center justify-end gap-2">
      {latest ? (
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/pcaps/${pcap.id}`} aria-label="Open capture details" title="Open">
            <ExternalLink size={16} />
          </Link>
        </Button>
      ) : (
        <Button variant="ghost" size="icon" disabled aria-label="Open capture" title="Awaiting job">
          <ExternalLink size={16} />
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={() => onDelete(pcap)} aria-label="Delete capture" title="Delete">
        <Trash2 size={16} />
      </Button>
    </div>
  )
}

export default function PcapsPage() {
  const [file, setFile] = useState<File | null>(null)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

  const { data: pcaps, isLoading } = useQuery({ queryKey: ['pcaps'], queryFn: api.listPcaps })

  const uploadMutation = useMutation({
    mutationFn: (f: File) => api.uploadPcap(f),
    onSuccess: () => {
      setFile(null)
      queryClient.invalidateQueries({ queryKey: ['pcaps'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deletePcap(String(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcaps'] })
    }
  })

  const handleDelete = (pcap: any) => {
    setDeleteTarget(pcap)
  }

  const confirmDelete = () => {
    if (!deleteTarget || deleteMutation.isPending) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null)
    })
  }

  const onUpload = () => {
    if (file) {
      uploadMutation.mutate(file)
    }
  }

  const { getRootProps, getInputProps } = useDropzone({
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
            <DataTable
              data={filtered}
              emptyLabel="No captures yet."
              tableClassName="min-w-[700px]"
              columns={[
                {
                  key: 'filename',
                  header: 'Filename',
                  cellClassName: 'font-medium max-w-[320px] truncate',
                  cell: (pcap) => (
                    <span className="block truncate" title={pcap.filename}>
                      {pcap.filename}
                    </span>
                  )
                },
                {
                  key: 'uploaded',
                  header: 'Uploaded',
                  cellClassName: 'text-muted-foreground',
                  cell: (pcap) => new Date(pcap.uploaded_at).toLocaleString()
                },
                {
                  key: 'status',
                  header: 'Status',
                  cellClassName: 'text-muted-foreground',
                  cell: (pcap) => <PcapStatusCell pcapId={String(pcap.id)} />
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  headerClassName: 'text-right whitespace-nowrap w-[160px] pr-6',
                  cellClassName: 'text-right whitespace-nowrap w-[160px]',
                  cell: (pcap) => <PcapActionsCell pcap={pcap} onDelete={handleDelete} />
                }
              ]}
            />
          )}
        </Panel>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => (!open ? setDeleteTarget(null) : null)}
        title="Delete capture?"
        description={
          deleteTarget
            ? `Delete ${deleteTarget.filename} and all derived flows/issues? This cannot be undone.`
            : 'Delete this capture and all derived flows/issues?'
        }
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        confirmDisabled={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </Page>
  )
}
