import { auth } from './auth'

const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  const token = auth.getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Request failed')
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json() as Promise<T>
}

export const api = {
  register(email: string, password: string) {
    return apiFetch<{ token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  },
  login(email: string, password: string) {
    return apiFetch<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  },
  me() {
    return apiFetch<{ id: number; email: string }>('/api/me')
  },
  listPcaps() {
    return apiFetch<any[]>('/api/pcaps')
  },
  getPcap(id: string) {
    return apiFetch<any>(`/api/pcaps/${id}`)
  },
  deletePcap(id: string) {
    return apiFetch<{ status: string }>(`/api/pcaps/${id}`, { method: 'DELETE' })
  },
  uploadPcap(file: File) {
    const form = new FormData()
    form.append('pcap', file)
    const token = auth.getToken()
    return fetch(`${API_URL}/api/pcaps/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Upload failed')
      }
      return res.json()
    })
  },
  listJobs(pcapId: string) {
    return apiFetch<any[]>(`/api/pcaps/${pcapId}/jobs`)
  },
  getJob(id: string) {
    return apiFetch<any>(`/api/jobs/${id}`)
  },
  getJobSummary(id: string) {
    return apiFetch<any>(`/api/jobs/${id}/summary`)
  },
  listFlows(pcapId: string) {
    return apiFetch<any[]>(`/api/pcaps/${pcapId}/flows`)
  },
  listJobFlows(jobId: string, params?: Record<string, string | number | undefined>, options?: { signal?: AbortSignal }) {
    const search = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return
        search.set(key, String(value))
      })
    }
    const qs = search.toString()
    return apiFetch<any[]>(`/api/jobs/${jobId}/flows${qs ? `?${qs}` : ''}`, { signal: options?.signal })
  },
  listJobPackets(jobId: string, params?: Record<string, string | number | undefined>, options?: { signal?: AbortSignal }) {
    const search = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return
        search.set(key, String(value))
      })
    }
    const qs = search.toString()
    return apiFetch<any>(`/api/jobs/${jobId}/packets${qs ? `?${qs}` : ''}`, { signal: options?.signal })
  },
  getFlow(flowId: string) {
    return apiFetch<any>(`/api/flows/${flowId}`)
  },
  getFlowTimeseries(flowId: string, params?: Record<string, string | number | undefined>, options?: { signal?: AbortSignal }) {
    const search = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return
        search.set(key, String(value))
      })
    }
    const qs = search.toString()
    return apiFetch<any>(`/api/flows/${flowId}/timeseries${qs ? `?${qs}` : ''}`, { signal: options?.signal })
  },
  listIssues(pcapId: string) {
    return apiFetch<any[]>(`/api/pcaps/${pcapId}/issues`)
  },
  listJobIssues(jobId: string) {
    return apiFetch<any[]>(`/api/jobs/${jobId}/issues`)
  },
  listIssuesForFlow(pcapId: string, flowId: string) {
    return apiFetch<any[]>(`/api/pcaps/${pcapId}/issues?flow_id=${flowId}`)
  },
  getIssue(issueId: string) {
    return apiFetch<any>(`/api/issues/${issueId}`)
  },
  getStats(pcapId: string) {
    return apiFetch<any>(`/api/pcaps/${pcapId}/stats`)
  },
  getSummary(pcapId: string) {
    return apiFetch<any>(`/api/pcaps/${pcapId}/summary`)
  },
  explainIssue(issueId: string) {
    return apiFetch<any>(`/api/issues/${issueId}/explain`, { method: 'POST' })
  },
  certInspect(flowId: string) {
    return apiFetch<any>(`/api/flows/${flowId}/cert-inspect`, { method: 'POST' })
  }
}
