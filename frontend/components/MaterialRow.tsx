'use client'

import { useState } from 'react'
import { Document } from '@/store/useAppStore'
import { useAppStore } from '@/store/useAppStore'

const EXT_ICONS: Record<string, string> = {
  pdf: '⬡',
  md: '◈',
  txt: '◻',
  pptx: '▣',
  png: '◉',
  jpg: '◉',
  jpeg: '◉',
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_ICONS[ext] ?? '◻'
}

const STATUS_VAR: Record<string, string> = {
  uploading: 'var(--color-status-uploading)',
  processing: 'var(--color-status-processing)',
  ready: 'var(--color-status-ready)',
  failed: 'var(--color-status-failed)',
  conflict: 'var(--color-status-conflict)',
}

export default function MaterialRow({
  doc,
  isConflicted,
}: {
  doc: Document
  isConflicted: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const statusColor = isConflicted
    ? 'var(--color-status-conflict)'
    : STATUS_VAR[doc.status] ?? 'var(--fg-muted)'

  const badgeLabel = isConflicted ? 'conflict' : doc.status

  function handleDeleteConfirm() {
    const { documents, setDocuments } = useAppStore.getState()
    setDocuments(documents.filter((d) => d.id !== doc.id))
    setConfirmOpen(false)
  }

  return (
    <div
      className="group relative flex items-center gap-2 px-3 py-2 transition-colors"
      style={{
        borderLeft: `2px solid ${statusColor}`,
        background: 'transparent',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      <span
        aria-hidden="true"
        className="shrink-0 text-xs"
        style={{ color: statusColor, fontFamily: 'monospace', lineHeight: 1 }}
      >
        {fileIcon(doc.name)}
      </span>

      <span
        className="flex-1 truncate text-xs"
        title={doc.name}
        style={{ color: 'var(--fg)', fontFamily: 'var(--font-body)', minWidth: 0 }}
      >
        {doc.name}
      </span>

      <span
        data-testid={`status-badge-${doc.id}`}
        className="shrink-0 font-mono"
        style={{ color: statusColor, fontSize: '9px', letterSpacing: '0.05em', textTransform: 'uppercase' }}
      >
        {badgeLabel}
      </span>

      <button
        aria-label={`Options for ${doc.name}`}
        className="shrink-0 rounded px-1 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: 'var(--fg-muted)', fontSize: '13px', lineHeight: 1 }}
        onClick={() => setMenuOpen((v) => !v)}
      >
        ···
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div
            role="menu"
            className="absolute right-2 top-8 z-20 min-w-[100px] rounded border py-1 shadow-xl"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <button
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left font-mono transition-colors"
              style={{ color: 'var(--color-status-failed)', fontSize: '11px' }}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.background = 'var(--surface-hover)')
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.background = 'transparent')
              }
              onClick={() => {
                setMenuOpen(false)
                setConfirmOpen(true)
              }}
            >
              delete
            </button>
          </div>
        </>
      )}

      {confirmOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setConfirmOpen(false)}
          />
          <dialog
            open
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded border p-5 shadow-2xl"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--fg)',
              minWidth: '260px',
              margin: 0,
            }}
          >
            <p className="mb-1 text-xs font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              Delete file?
            </p>
            <p
              className="mb-4 truncate font-mono"
              style={{ color: 'var(--fg-muted)', fontSize: '11px' }}
            >
              {doc.name}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="rounded border px-3 py-1 font-mono text-xs transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                onClick={() => setConfirmOpen(false)}
              >
                cancel
              </button>
              <button
                className="rounded px-3 py-1 font-mono text-xs transition-colors"
                style={{ background: 'var(--color-status-failed)', color: '#fff' }}
                onClick={handleDeleteConfirm}
              >
                Confirm
              </button>
            </div>
          </dialog>
        </>
      )}
    </div>
  )
}
