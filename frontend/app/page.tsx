'use client'

import { useEffect } from 'react'
import TwoPanelShell from '@/components/TwoPanelShell'
import { useAppStore } from '@/store/useAppStore'

const DEV_DOCS = [
  { id: 'dev-1', name: 'architecture-overview.pdf', status: 'ready' as const },
  { id: 'dev-2', name: 'meeting-notes.md', status: 'processing' as const },
  { id: 'dev-3', name: 'product-deck.pptx', status: 'uploading' as const },
  { id: 'dev-4', name: 'error-log.txt', status: 'failed' as const },
  { id: 'dev-5', name: 'system-diagram.png', status: 'conflict' as const },
]

const DEV_MESSAGES = [
  { id: 'm1', type: 'user' as const, content: 'What does the architecture doc say about retrieval?' },
  { id: 'm2', type: 'agent' as const, content: 'The architecture uses **pgvector** for chunk retrieval.\n\n- Index lookup first\n- Then raw chunk fetch\n- Conflict flags checked before synthesis' },
]

export default function Home() {
  const setDocuments = useAppStore((s) => s.setDocuments)
  const setActiveConflicts = useAppStore((s) => s.setActiveConflicts)
  const addMessage = useAppStore((s) => s.addMessage)

  useEffect(() => {
    setDocuments(DEV_DOCS)
    setActiveConflicts(['dev-5'])
    DEV_MESSAGES.forEach(addMessage)
  }, [setDocuments, setActiveConflicts, addMessage])

  return <TwoPanelShell />
}
