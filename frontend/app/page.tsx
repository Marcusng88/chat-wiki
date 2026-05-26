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

export default function Home() {
  const setDocuments = useAppStore((s) => s.setDocuments)
  const setActiveConflicts = useAppStore((s) => s.setActiveConflicts)

  useEffect(() => {
    setDocuments(DEV_DOCS)
    setActiveConflicts(['dev-5'])
  }, [setDocuments, setActiveConflicts])

  return <TwoPanelShell />
}
