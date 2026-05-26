'use client'

import { useState } from 'react'
import { Document } from '@/store/useAppStore'
import { useAppStore } from '@/store/useAppStore'

const EXT_ICONS: Record<string, string> = {
  pdf: '📄',
  md: '📝',
  txt: '📃',
  pptx: '📊',
  png: '🖼',
  jpg: '🖼',
  jpeg: '🖼',
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_ICONS[ext] ?? '📄'
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

  const badgeColor = isConflicted
    ? 'var(--color-status-conflict)'
    : STATUS_VAR[doc.status] ?? 'var(--fg-muted)'

  const badgeLabel = isConflicted ? 'conflict' : doc.status

  function handleDeleteConfirm() {
    const { documents, setDocuments } = useAppStore.getState()
    setDocuments(documents.filter((d) => d.id !== doc.id))
    setConfirmOpen(false)
  }

  return (
    <div className="relative flex items-center gap-2 px-3 py-2 text-sm" style={{ color: 'var(--fg)' }}>
      <span aria-hidden="true">{fileIcon(doc.name)}</span>

      <span
        className="flex-1 truncate"
        title={doc.name}
        style={{ minWidth: 0 }}
      >
        {doc.name}
      </span>

      <span
        data-testid={`status-badge-${doc.id}`}
        className="shrink-0 text-xs font-medium"
        style={{ color: badgeColor }}
      >
        {badgeLabel}
      </span>

      <button
        aria-label={`Options for ${doc.name}`}
        className="shrink-0 rounded px-1"
        style={{ color: 'var(--fg-muted)' }}
        onClick={() => setMenuOpen((v) => !v)}
      >
        ···
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-8 z-10 rounded border py-1 shadow-lg"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <button
            role="menuitem"
            className="block w-full px-4 py-2 text-left text-sm"
            style={{ color: 'var(--color-status-failed)' }}
            onClick={() => {
              setMenuOpen(false)
              setConfirmOpen(true)
            }}
          >
            Delete
          </button>
        </div>
      )}

      {confirmOpen && (
        <dialog
          open
          className="fixed inset-0 z-50 m-auto rounded border p-6 shadow-xl"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        >
          <p className="mb-4 text-sm">Delete &ldquo;{doc.name}&rdquo;?</p>
          <div className="flex gap-3 justify-end">
            <button
              className="text-sm"
              style={{ color: 'var(--fg-muted)' }}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </button>
            <button
              className="text-sm font-medium"
              style={{ color: 'var(--color-status-failed)' }}
              onClick={handleDeleteConfirm}
            >
              Confirm
            </button>
          </div>
        </dialog>
      )}
    </div>
  )
}
