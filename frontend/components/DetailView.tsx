'use client'

import { useState, useEffect } from 'react'
import type { Document } from '@/lib/types'
import { Back } from './Icons'
import Markdown from './Markdown'
import { getDocumentRaw } from '@/lib/api'

const FILE_LABEL: Record<string, string> = {
  pdf: 'PDF', md: 'MD', txt: 'TXT', pptx: 'PPT', img: 'IMG',
}

interface Props {
  doc: Document
  onBack: () => void
}

export default function DetailView({ doc, onBack }: Props) {
  const [tab, setTab] = useState<'wiki' | 'raw' | 'meta'>('wiki')
  const [rawText, setRawText] = useState<string | null>(null)
  const [rawLoading, setRawLoading] = useState(false)

  useEffect(() => {
    if (tab !== 'raw' || rawText !== null || rawLoading) return
    setRawLoading(true)
    getDocumentRaw(doc.id)
      .then((text) => setRawText(text))
      .catch(() => setRawText(''))
      .finally(() => setRawLoading(false))
  }, [tab, doc.id, rawText, rawLoading])

  return (
    <div className="detail-view">
      <div className="detail-head">
        <button className="back-btn" onClick={onBack}><Back /> Back to sources</button>
        <div className="detail-title">{doc.title}</div>
        <div className="detail-meta">
          <span className="pill">{FILE_LABEL[doc.fileType] ?? doc.fileType}</span>
          <span className="pill">{doc.size}</span>
          <span className="pill">{doc.pages} {doc.pages === 1 ? 'page' : 'pages'}</span>
          <span className="pill">added {doc.addedAt}</span>
          {doc.hasConflict && (
            <span className="pill" style={{ color: 'var(--status-conflict)' }}>conflict flagged</span>
          )}
        </div>
      </div>

      <div className="detail-tabs">
        <button className={`detail-tab${tab === 'wiki' ? ' active' : ''}`} onClick={() => setTab('wiki')}>Wiki</button>
        <button className={`detail-tab${tab === 'raw' ? ' active' : ''}`} onClick={() => setTab('raw')}>Raw</button>
        <button className={`detail-tab${tab === 'meta' ? ' active' : ''}`} onClick={() => setTab('meta')}>Metadata</button>
      </div>

      <div className="detail-body">
        {tab === 'wiki' && doc.wikiPage && (
          <Markdown md={doc.wikiPage} />
        )}
        {tab === 'wiki' && !doc.wikiPage && (
          <div className="empty">
            {(doc.status.startsWith('failed_') || doc.status === 'failed' || doc.status === 'unsupported')
              ? 'Wiki not generated — ingestion failed.'
              : doc.status === 'ready'
                ? 'Wiki page missing — re-ingest to regenerate.'
                : 'Wiki generation in progress…'}
          </div>
        )}
        {tab === 'raw' && (
          <>
            <h3>Source excerpt</h3>
            <div className="detail-raw">
              {rawLoading
                ? 'Loading…'
                : rawText
                  ? rawText
                  : '— no raw text available —'}
            </div>
          </>
        )}
        {tab === 'meta' && (
          <dl className="kv-grid">
            <dt>file_type</dt><dd>{doc.fileType}</dd>
            <dt>status</dt><dd>{doc.status}</dd>
            <dt>added</dt><dd>{doc.addedAt}</dd>
            <dt>conflict</dt><dd>{doc.hasConflict ? 'flagged' : 'none'}</dd>
            {doc.summary && (
              <>
                <dt>summary</dt><dd style={{ color: 'var(--text-secondary)' }}>{doc.summary}</dd>
              </>
            )}
            {doc.topics && doc.topics.length > 0 && (
              <>
                <dt>topics</dt>
                <dd>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {doc.topics.map((t) => <span key={t} className="entity-chip">{t}</span>)}
                  </div>
                </dd>
              </>
            )}
            {doc.failReason && (
              <>
                <dt>fail_reason</dt>
                <dd style={{ color: 'var(--status-failed)' }}>{doc.failReason}</dd>
              </>
            )}
          </dl>
        )}
      </div>
    </div>
  )
}
