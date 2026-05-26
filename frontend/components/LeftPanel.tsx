'use client'

import { useAppStore } from '@/store/useAppStore'
import MaterialRow from './MaterialRow'
import UploadZone from './UploadZone'

export default function LeftPanel() {
  const { documents } = useAppStore()

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <p
          className="font-mono uppercase"
          style={{ color: 'var(--fg-muted)', fontSize: '10px', letterSpacing: '0.12em' }}
        >
          Materials
        </p>
        {documents.length > 0 && (
          <p
            className="mt-0.5 font-mono"
            style={{ color: 'var(--accent)', fontSize: '10px' }}
          >
            {documents.length} file{documents.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <UploadZone />

      <div
        className="flex-1 overflow-y-auto"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-1">
            <p className="font-mono text-center" style={{ color: 'var(--fg-muted)', fontSize: '11px' }}>
              no materials yet
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <MaterialRow
              key={doc.id}
              doc={doc}
              isConflicted={doc.hasConflict}
            />
          ))
        )}
      </div>
    </div>
  )
}
