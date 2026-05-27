'use client'

import { useCallback, useEffect } from 'react'
import { useAppStore, useActiveConflicts } from '@/store/useAppStore'
import { useConfirm } from '@/lib/hooks/useConfirm'
import type { Document, FileType, ProcessingStage } from '@/lib/types'
import MaterialRow from './MaterialRow'
import UploadZone from './UploadZone'
import DetailView from './DetailView'
import { ChevronLeft, ChevronRight, Sparkle } from './Icons'

function toFileType(filename: string): FileType {
  const ext = (filename.split('.').pop() ?? '').toLowerCase()
  if (ext === 'pdf' || ext === 'md' || ext === 'txt' || ext === 'pptx') return ext
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') return 'img'
  return 'txt'
}

export default function LeftPanel() {
  const {
    documents,
    setDocuments,
    leftPanelView,
    selectedDocId,
    openDocument,
    backToList,
    leftCollapsed,
    setLeftCollapsed,
  } = useAppStore()
  const activeConflicts = useActiveConflicts()
  const requestConfirm = useConfirm()
  const selectedDoc = documents.find((d) => d.id === selectedDocId)

  // Animate processing / uploading progress in dev
  useEffect(() => {
    const t = setInterval(() => {
      setDocuments((docs) => {
        if (!docs.some((d) => d.status === 'processing' || d.status === 'uploading')) return docs
        return docs.map((d): Document => {
          if (d.status === 'processing' && typeof d.progress === 'number' && d.progress < 99) {
            const next = Math.min(99, d.progress + Math.random() * 3)
            const stage: ProcessingStage =
              next < 30 ? 'extracting' : next < 60 ? 'chunking' : next < 85 ? 'generating_wiki' : 'indexing'
            return { ...d, progress: next, stage }
          }
          if (d.status === 'uploading' && typeof d.progress === 'number') {
            const next = d.progress + Math.random() * 8
            if (next >= 100)
              return { ...d, status: 'processing', progress: 5, stage: 'extracting' } as Document
            return { ...d, progress: next }
          }
          return d
        })
      })
    }, 900)
    return () => clearInterval(t)
  }, [setDocuments])

  const onUpload = useCallback(
    (files: File[]) => {
      const newDocs: Document[] = files.map((f, i) => ({
        id: 'u' + Date.now() + i,
        title: f.name,
        fileType: toFileType(f.name),
        status: 'uploading',
        progress: 0,
        hasConflict: false,
        pages: 1,
        addedAt: 'just now',
        size: f.size ? `${(f.size / 1024).toFixed(0)} KB` : '— KB',
      }))
      setDocuments((prev) => [...newDocs, ...prev])
    },
    [setDocuments]
  )

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
      setDocuments((docs) => docs.filter((d) => d.id !== id))
      if (selectedDocId === id) backToList()
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
    // TODO: call POST /agent/resolve
  }, [requestConfirm])

  function onToggleCollapsed() {
    setLeftCollapsed((v) => {
      if (!v) backToList()
      return !v
    })
  }

  const readyCount = documents.filter((d) => d.status === 'ready').length

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
                  }}
                  onDelete={onDelete}
                  collapsed={leftCollapsed}
                />
              ))}
            </div>
          </div>
          {activeConflicts.length > 0 && (
            <div className="resolver-bar">
              <button className="resolver-btn" onClick={onResolverClick}>
                <span className="resolver-icon"><Sparkle /></span>
                <span className="resolver-text">
                  <span className="resolver-title">Check for conflicts</span>
                  <span className="resolver-sub">
                    Spots disagreements between your files — the assistant asks before anything changes.
                  </span>
                </span>
                <span className="resolver-count">
                  <span className="n">{activeConflicts.length}</span>
                  <span className="lbl">flagged</span>
                </span>
              </button>
            </div>
          )}
        </>
      )}

      {leftPanelView === 'detail' && selectedDoc && (
        <DetailView doc={selectedDoc} onBack={backToList} />
      )}
    </>
  )
}
