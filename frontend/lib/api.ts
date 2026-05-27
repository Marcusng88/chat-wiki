import { createClient } from './supabase'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  const res = await fetch(`${BACKEND}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

export interface DocumentResponse {
  id: string
  title: string
  file_type: string
  status: string
  has_conflict: boolean
  created_at: string
  wiki_page: string | null
  summary: string | null
  topics: string[]
}

export interface PresignResponse {
  document_id: string
  presigned_url: string
}

export function listDocuments(): Promise<DocumentResponse[]> {
  return apiFetch('/documents')
}

export function presignDocument(filename: string, file_type: string, title: string): Promise<PresignResponse> {
  return apiFetch('/documents/presign', {
    method: 'POST',
    body: JSON.stringify({ filename, file_type, title }),
  })
}

export function confirmDocument(document_id: string): Promise<void> {
  return apiFetch('/documents/confirm', {
    method: 'POST',
    body: JSON.stringify({ document_id }),
  })
}

export async function getDocumentRaw(document_id: string): Promise<string> {
  const data = await apiFetch<{ raw: string }>(`/documents/${document_id}/raw`)
  return data.raw
}

export function deleteDocument(document_id: string): Promise<void> {
  return apiFetch(`/documents/${document_id}`, { method: 'DELETE' })
}

export function uploadToStorage(
  presignedUrl: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`upload failed: ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('upload network error'))
    xhr.send(file)
  })
}
