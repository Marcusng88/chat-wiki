'use client'

import { useCallback } from 'react'
import { useAppStore, useActiveConflicts } from '@/store/useAppStore'
import { useConfirm } from '@/lib/hooks/useConfirm'
import { useDocuments } from '@/lib/hooks/useDocuments'
import { presignDocument, uploadToStorage, confirmDocument, deleteDocument } from '@/lib/api'
import type { Document, FileType } from '@/lib/types'
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

function toApiFileType(ft: FileType): string {
  return ft === 'img' ? 'image' : ft
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

  useDocuments()

  const onUpload = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const fileType = toFileType(file.name)
        const tempId = `tmp-${Date.now()}-${Math.random()}`
        const optimistic: Document = {
          id: tempId,
          title: file.name,
          fileType,
          status: 'uploading',
          progress: 0,
          hasConflict: false,
          pages: 1,
          addedAt: 'just now',
          size: file.size ? `${(file.size / 1024).toFixed(0)} KB` : '— KB',
        }
        setDocuments((prev) => [optimistic, ...prev])

        try {
          const { document_id, presigned_url } = await presignDocument(
            file.name,
            toApiFileType(fileType),
            file.name,
          )
          setDocuments((prev) => prev.map((d) => d.id === tempId ? { ...d, id: document_id } : d))

          await uploadToStorage(presigned_url, file, (pct) => {
            setDocuments((prev) =>
              prev.map((d) => d.id === document_id ? { ...d, progress: pct } : d)
            )
          })

          await confirmDocument(document_id)
          setDocuments((prev) =>
            prev.map((d) => d.id === document_id ? { ...d, status: 'uploaded', progress: undefined } : d)
          )
        } catch (e) {
          console.error('upload failed', e)
          setDocuments((prev) =>
            prev.map((d) =>
              (d.id === tempId || d.id === file.name)
                ? { ...d, status: 'failed', failReason: String(e) }
                : d
            )
          )
        }
      }
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
        <DetailView key={selectedDoc.id} doc={selectedDoc} onBack={backToList} />
      )}
    </>
  )
}
