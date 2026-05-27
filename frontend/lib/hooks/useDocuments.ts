'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { createClient } from '@/lib/supabase'
import { listDocuments, DocumentResponse } from '@/lib/api'
import type { Document, DocumentStatus, FileType } from '@/lib/types'

function toFileType(fileType: string): FileType {
  if (fileType === 'pdf' || fileType === 'md' || fileType === 'txt' || fileType === 'pptx') return fileType
  if (fileType === 'image') return 'img'
  return 'txt'
}

function rowToDocument(r: Awaited<ReturnType<typeof listDocuments>>[number]): Document {
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
  const { setDocuments } = useAppStore()

  useEffect(() => {
    let cancelled = false

    async function fetchDocs() {
      try {
        const rows = await listDocuments()
        if (cancelled) return
        setDocuments(rows.map(rowToDocument))
      } catch (e) {
        console.error('useDocuments fetch failed', e)
      }
    }

    fetchDocs()

    const supabase = createClient()
    const channel = supabase
      .channel('documents-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setDocuments((prev) => prev.filter((d) => d.id !== (payload.old as { id: string }).id))
            return
          }
          const row = payload.new as Record<string, unknown>
          setDocuments((prev) => {
            const exists = prev.some((d) => d.id === row.id)
            if (!exists) {
              return [rowToDocument(row as unknown as DocumentResponse), ...prev]
            }
            return prev.map((d) =>
              d.id === row.id
                ? {
                    ...d,
                    status: row.status as DocumentStatus,
                    wikiPage: (row.wiki_page as string | null) ?? d.wikiPage,
                    summary: (row.summary as string | null) ?? d.summary,
                    topics: Array.isArray(row.topics) && row.topics.length > 0 ? row.topics as string[] : d.topics,
                  }
                : d
            )
          })
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [setDocuments])
}
