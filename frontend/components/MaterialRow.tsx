'use client'

import { useEffect, useRef, useState } from 'react'
import type { Document } from '@/lib/types'
import { FileIcon, Alert, More, Eye, Trash } from './Icons'

const FILE_ICON_CLASS: Record<string, string> = {
  pdf: 'ftype-pdf',
  md: 'ftype-md',
  txt: 'ftype-txt',
  pptx: 'ftype-pptx',
  img: 'ftype-img',
}

const FAILED_STATUSES = new Set(['failed', 'failed_extraction', 'failed_embedding', 'failed_wiki', 'failed_indexing'])
const PROCESSING_STATUSES = new Set(['uploaded', 'extracting', 'chunking', 'embedding', 'generating_wiki', 'indexing', 'conflict_scan'])

function StatusBadge({ doc }: { doc: Document }) {
  if (doc.status === 'ready')
    return <span className="status-badge ready"><span className="pip" />ready</span>
  if (doc.status === 'unsupported')
    return <span className="status-badge failed"><span className="pip" />unsupported</span>
  if (FAILED_STATUSES.has(doc.status)) {
    const label = doc.status.replace('failed_', 'failed ')
    return <span className="status-badge failed"><span className="pip" />{label}</span>
  }
  if (doc.status === 'uploading')
    return (
      <span className="status-badge uploading">
        <span className="pip" />uploading{doc.progress != null ? ` ${Math.round(doc.progress)}%` : ''}
      </span>
    )
  if (PROCESSING_STATUSES.has(doc.status)) {
    const label = doc.status.replace(/_/g, ' ')
    return <span className="status-badge processing"><span className="pip" />{label}</span>
  }
  return <span className="status-badge">{doc.status.replace(/_/g, ' ')}</span>
}

interface TipState { top: number; left: number; side: 'right' | 'below' }

interface Props {
  doc: Document
  active?: boolean
  onClick?: (id: string) => void
  onDelete?: (id: string) => void
  collapsed?: boolean
}

export default function MaterialRow({ doc, active = false, onClick, onDelete, collapsed = false }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [tip, setTip] = useState<TipState | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  useEffect(() => {
    if (!tip) return
    function onScroll() { setTip(null) }
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [tip])

  const isBusy = doc.status === 'uploading' && typeof doc.progress === 'number'
  const isFailed = FAILED_STATUSES.has(doc.status) || doc.status === 'unsupported'

  const hint = isFailed
    ? `Couldn't read this file${doc.failReason ? ' — ' + doc.failReason : ''}. Open the menu to try again or remove it.`
    : doc.hasConflict
      ? `Two of your files disagree on something here. When it matters for an answer, the assistant will ask you which one to trust.`
      : null

  function showTip() {
    if (!hint || !rowRef.current) return
    if (tipTimer.current) clearTimeout(tipTimer.current)
    tipTimer.current = setTimeout(() => {
      if (!rowRef.current) return
      const r = rowRef.current.getBoundingClientRect()
      if (collapsed) {
        setTip({ top: r.top + r.height / 2, left: r.right + 12, side: 'right' })
      } else {
        setTip({ top: r.bottom + 6, left: r.left + 48, side: 'below' })
      }
    }, 320)
  }

  function hideTip() {
    if (tipTimer.current) clearTimeout(tipTimer.current)
    setTip(null)
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setMenuOpen(false)
    onDelete?.(doc.id)
  }

  return (
    <div
      ref={rowRef}
      data-testid={`material-row-${doc.id}`}
      className={['material-row', active && 'active', menuOpen && 'menu-open', isFailed && 'is-failed', doc.hasConflict && 'has-conflict'].filter(Boolean).join(' ')}
      onClick={() => onClick?.(doc.id)}
      onMouseEnter={showTip}
      onMouseLeave={hideTip}
    >
      <div className={`file-icon ${FILE_ICON_CLASS[doc.fileType] ?? ''}`}>
        <FileIcon type={doc.fileType} />
        {isFailed && (
          <span className="overlay-mark fail-mark" aria-label="failed">✕</span>
        )}
        {!isFailed && doc.hasConflict && (
          <span className="overlay-mark conflict-mark" aria-label="conflict flagged">
            <Alert />
          </span>
        )}
      </div>

      <div className="title-col">
        <div className="title" title={doc.title}>{doc.title}</div>
        <div className="sub">
          {isBusy
            ? <span className="busy">uploading · {Math.round(doc.progress!)}%</span>
            : PROCESSING_STATUSES.has(doc.status)
              ? <span className="busy"><span className="spinner" aria-hidden="true" /> processing…</span>
              : <span>{doc.addedAt}</span>
          }
        </div>
      </div>

      <div className="menu-wrap" ref={menuRef}>
        <button
          className="row-menu-btn"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
          aria-label="More actions"
        >
          <More />
        </button>
        {menuOpen && (
          <div className="row-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onClick?.(doc.id) }}>
              <Eye /><span>Open</span>
            </button>
            <div className="row-menu-sep" />
            <button className="danger" onClick={handleDelete}>
              <Trash /><span>Delete source</span>
            </button>
          </div>
        )}
      </div>

      {isBusy && (
        <div className="progress-rail">
          <div className="fill" style={{ width: `${Math.round(doc.progress!)}%` }} />
        </div>
      )}

      {tip && (
        <div
          className={['floating-tip', `side-${tip.side}`, isFailed && 'is-failed', doc.hasConflict && 'has-conflict'].filter(Boolean).join(' ')}
          style={{ top: tip.top, left: tip.left }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}

export { StatusBadge }
