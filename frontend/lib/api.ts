import { createClient } from './supabase'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000'

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
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

export async function listDocuments(): Promise<DocumentResponse[]> {
  const headers = await authHeaders()
  const res = await fetch(`${BACKEND}/documents`, { headers })
  if (!res.ok) throw new Error(`listDocuments failed: ${res.status}`)
  return res.json()
}

export async function presignDocument(
  filename: string,
  file_type: string,
  title: string,
): Promise<PresignResponse> {
  const headers = await authHeaders()
  const res = await fetch(`${BACKEND}/documents/presign`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ filename, file_type, title }),
  })
  if (!res.ok) throw new Error(`presign failed: ${res.status}`)
  return res.json()
}

export async function confirmDocument(document_id: string): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch(`${BACKEND}/documents/confirm`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ document_id }),
  })
  if (!res.ok) throw new Error(`confirm failed: ${res.status}`)
}

export async function deleteDocument(document_id: string): Promise<void> {
  const headers = await authHeaders()
  delete headers['Content-Type']
  const res = await fetch(`${BACKEND}/documents/${document_id}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) throw new Error(`delete failed: ${res.status}`)
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
