'use client'

import { useCallback, useState } from 'react'
import { useDocumentStore, useActiveConflicts } from '@/store/useDocumentStore'
import { useUIStore } from '@/store/useUIStore'
import { useConfirm } from '@/lib/hooks/useConfirm'
import { useDocuments, rowToDocument } from '@/lib/hooks/useDocuments'
import { useDocumentUpload } from '@/lib/hooks/useDocumentUpload'
import { deleteDocument, listDocuments, resolveConflicts } from '@/lib/api'
import MaterialRow from './MaterialRow'
import UploadZone from './UploadZone'
import DetailView from './DetailView'
import { ChevronLeft, ChevronRight, Sparkle } from './Icons'

export default function LeftPanel() {
  const {
    documents,
    setDocuments,
    leftPanelView,
    selectedDocId,
    openDocument,
    backToList,
  } = useDocumentStore()
  const { leftCollapsed, setLeftCollapsed, setMobileDrawerOpen } = useUIStore()
  const activeConflicts = useActiveConflicts()
  const requestConfirm = useConfirm()
  const selectedDoc = documents.find((d) => d.id === selectedDocId)
  const { upload: onUpload } = useDocumentUpload()
  const [scanning, setScanning] = useState(false)

  useDocuments()

  const onDelete = useCallback(
    async (id: string) => {
      const doc = documents.find((d) => d.id === id)
      if (!doc) return
      const ok = await requestConfirm({
        title: `Delete "${doc.title}"?`,
        message: `The file is removed for good, along with everything the assistant learned from it. Your other files aren't touched.`,
        confirmText: 'Delete',
        cancelText: 'Keep it',
        danger: true,
      })
      if (!ok) return
      const snapshot = [...documents]
      setDocuments((docs) => docs.filter((d) => d.id !== id))
      if (selectedDocId === id) backToList()
      try {
        await deleteDocument(id)
      } catch (e) {
        console.error('delete failed', e)
        setDocuments(snapshot)
      }
    },
    [documents, setDocuments, selectedDocId, backToList, requestConfirm]
  )

  const onResolverClick = useCallback(async () => {
    const ok = await requestConfirm({
      title: 'Check for conflicts?',
      message: `I'll quietly scan files I haven't checked yet and mark anything that looks like a disagreement. Nothing actually changes — the next time one of those topics comes up in chat, the assistant will ask you which file to trust.`,
      confirmText: 'Start checking',
      cancelText: 'Not now',
    })
    if (!ok) return
    setScanning(true)
    try {
      await resolveConflicts()
    } catch (e) {
      console.error('resolve failed', e)
      setScanning(false)
      return
    }
    // Resolver runs in the background and only flips has_conflict (not status),
    // so the status poll won't catch it — re-poll documents for a short window.
    let ticks = 0
    const id = setInterval(async () => {
      ticks += 1
      try {
        const rows = await listDocuments()
        setDocuments(rows.map(rowToDocument))
      } catch (e) {
        console.error('resolve refetch failed', e)
      }
      if (ticks >= 10) {
        clearInterval(id)
        setScanning(false)
      }
    }, 3000)
  }, [requestConfirm, setDocuments])

  function onToggleCollapsed() {
    setLeftCollapsed((v) => {
      if (!v) backToList()
      return !v
    })
  }

  const readyCount = documents.filter((d) => d.status === 'ready').length
  const hasUnscanned = documents.some((d) => d.status === 'ready' && !d.scanned)
  const resolverDisabled = scanning || !hasUnscanned

  return (
    <>
      <div className="panel-header">
        {!leftCollapsed && <span className="label">Sources</span>}
        <div className="meta">
          {!leftCollapsed && (
            <>
              <span className="live-dot" />
              <span>{readyCount} / {documents.length}</span>
            </>
          )}
          <button
            className="icon-btn collapse-btn"
            onClick={onToggleCollapsed}
            aria-label={leftCollapsed ? 'Expand sources' : 'Collapse sources'}
            title={leftCollapsed ? 'Expand sources' : 'Collapse sources'}
          >
            {leftCollapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
        </div>
      </div>

      {leftPanelView === 'list' && (
        <>
          <UploadZone onFiles={onUpload} />
          <div className="material-list-wrap">
            <div className="list-section-head">
              <span>library</span>
              <span className="count">{documents.length}</span>
              <span className="sort">↓ recent</span>
            </div>
            <div className="material-list">
              {documents.map((d) => (
                <MaterialRow
                  key={d.id}
                  doc={d}
                  active={selectedDocId === d.id}
                  onClick={(id) => {
                    if (leftCollapsed) onToggleCollapsed()
                    openDocument(id)
                    setMobileDrawerOpen(false)
                  }}
                  onDelete={onDelete}
                  collapsed={leftCollapsed}
                />
              ))}
            </div>
          </div>
          <div className="resolver-bar">
            <button
              className="resolver-btn"
              onClick={onResolverClick}
              disabled={resolverDisabled}
              aria-busy={scanning}
            >
              <span className="resolver-icon"><Sparkle /></span>
              <span className="resolver-text">
                <span className="resolver-title">
                  {scanning ? 'Checking…' : hasUnscanned ? 'Check for conflicts' : 'All files checked'}
                </span>
                <span className="resolver-sub">
                  {scanning
                    ? 'Scanning your files for disagreements — this runs in the background.'
                    : hasUnscanned
                      ? 'Spots disagreements between your files — the assistant asks before anything changes.'
                      : 'Nothing new to check. Upload more files to run another scan.'}
                </span>
              </span>
              {activeConflicts.length > 0 && (
                <span className="resolver-count">
                  <span className="n">{activeConflicts.length}</span>
                  <span className="lbl">flagged</span>
                </span>
              )}
            </button>
          </div>
        </>
      )}

      {leftPanelView === 'detail' && selectedDoc && (
        <DetailView key={selectedDoc.id} doc={selectedDoc} onBack={backToList} />
      )}
    </>
  )
}
