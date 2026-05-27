'use client'

import { useEffect } from 'react'
import TwoPanelShell from '@/components/TwoPanelShell'
import { useAppStore } from '@/store/useAppStore'
import type { Document, Message } from '@/lib/types'

const DEV_DOCS: Document[] = [
  { id: 'dev-1', title: 'architecture-overview.pdf', fileType: 'pdf', status: 'ready', hasConflict: false, pages: 12, addedAt: 'may 20', size: '1.2 MB' },
  { id: 'dev-2', title: 'meeting-notes.md', fileType: 'md', status: 'processing', progress: 45, stage: 'generating_wiki', hasConflict: false, pages: 1, addedAt: 'may 21', size: '14 KB' },
  { id: 'dev-3', title: 'product-deck.pptx', fileType: 'pptx', status: 'uploading', progress: 28, hasConflict: false, pages: 22, addedAt: 'just now', size: '— KB' },
  { id: 'dev-4', title: 'error-log.txt', fileType: 'txt', status: 'failed', failReason: 'no readable text found', hasConflict: false, pages: 1, addedAt: '2 days ago', size: '4 KB' },
  { id: 'dev-5', title: 'design-decisions.md', fileType: 'md', status: 'ready', hasConflict: true, pages: 1, addedAt: 'apr 02', size: '6 KB' },
]

const DEV_MESSAGES: Message[] = [
  { id: 'm1', role: 'user', content: 'What does the architecture doc say about retrieval?', ts: '11:42' },
  { id: 'm2', role: 'agent', ts: '11:43', md: 'The architecture uses **pgvector** for chunk retrieval.\n\n- Index lookup first\n- Then raw chunk fetch\n- Conflict flags checked before synthesis' },
]

export default function Home() {
  const setDocuments = useAppStore((s) => s.setDocuments)
  const addMessage = useAppStore((s) => s.addMessage)

  useEffect(() => {
    setDocuments(DEV_DOCS)
    DEV_MESSAGES.forEach(addMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <TwoPanelShell />
}
