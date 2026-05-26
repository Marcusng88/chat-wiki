'use client'

import { useAppStore } from '@/store/useAppStore'
import MaterialRow from './MaterialRow'
import UploadZone from './UploadZone'

export default function LeftPanel() {
  const { documents, activeConflicts } = useAppStore()

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)', fontFamily: 'var(--font-display)' }}>
          Materials
        </h2>
      </div>

      <UploadZone />

      <div className="flex-1 overflow-y-auto">
        {documents.map((doc) => (
          <MaterialRow
            key={doc.id}
            doc={doc}
            isConflicted={activeConflicts.includes(doc.id)}
          />
        ))}
        {documents.length === 0 && (
          <p className="px-4 py-6 text-center text-xs" style={{ color: 'var(--fg-muted)' }}>
            No materials yet
          </p>
        )}
      </div>
    </div>
  )
}
