'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { listDocuments, DocumentResponse } from '@/lib/api'
import type { Document, DocumentStatus, FileType } from '@/lib/types'

const PROCESSING_STATUSES = new Set([
  'uploaded', 'extracting', 'chunking', 'embedding',
  'generating_wiki', 'indexing', 'conflict_scan',
])

function toFileType(fileType: string): FileType {
  if (fileType === 'pdf' || fileType === 'md' || fileType === 'txt' || fileType === 'pptx') return fileType
  if (fileType === 'image') return 'img'
  return 'txt'
}

export function rowToDocument(r: Awaited<ReturnType<typeof listDocuments>>[number]): Document {
  return {
    id: r.id,
    title: r.title,
    fileType: toFileType(r.file_type),
    status: r.status as DocumentStatus,
    hasConflict: r.has_conflict,
    pages: 1,
    addedAt: new Date(r.created_at).toLocaleDateString(),
    size: '—',
    wikiPage: r.wiki_page ?? undefined,
    summary: r.summary ?? undefined,
    topics: r.topics.length > 0 ? r.topics : undefined,
  }
}

export function useDocuments() {
  const setDocuments = useAppStore((s) => s.setDocuments)
  const documents = useAppStore((s) => s.documents)

  // Initial fetch
  useEffect(() => {
    let cancelled = false
    listDocuments()
      .then((rows) => { if (!cancelled) setDocuments(rows.map(rowToDocument)) })
      .catch((e) => console.error('useDocuments fetch failed', e))
    return () => { cancelled = true }
  }, [setDocuments])

  // Poll every 3s while any doc is processing; stops when all terminal
  useEffect(() => {
    const anyProcessing = documents.some((d) => PROCESSING_STATUSES.has(d.status))
    if (!anyProcessing) return
    let cancelled = false
    const id = setInterval(() => {
      listDocuments()
        .then((rows) => { if (!cancelled) setDocuments(rows.map(rowToDocument)) })
        .catch((e) => console.error('useDocuments poll failed', e))
    }, 3000)
    return () => { cancelled = true; clearInterval(id) }
  }, [documents, setDocuments])
}
