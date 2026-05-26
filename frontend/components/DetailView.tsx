'use client'

import { useState } from 'react'
import type { Document } from '@/lib/types'
import { Back } from './Icons'

const FILE_LABEL: Record<string, string> = {
  pdf: 'PDF', md: 'MD', txt: 'TXT', pptx: 'PPT', img: 'IMG',
}

interface Props {
  doc: Document
  onBack: () => void
}

export default function DetailView({ doc, onBack }: Props) {
  const [tab, setTab] = useState<'wiki' | 'raw' | 'meta'>('wiki')

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
        {tab === 'wiki' && doc.wiki && (
          <>
            <h3>Summary</h3>
            <p>{doc.wiki.summary}</p>
            <h3>Concepts</h3>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {doc.wiki.concepts.map((c) => (
                <span key={c} className="entity-chip">{c}</span>
              ))}
            </div>
            <h3>Entities</h3>
            <div className="entity-grid">
              {doc.wiki.entities.map((e, i) => (
                <div key={i} className="entity-chip"><em>{e.kind}</em>{e.name}</div>
              ))}
            </div>
            <h3>Retrieval hints</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{doc.wiki.retrieval}</p>
          </>
        )}
        {tab === 'wiki' && !doc.wiki && (
          <div className="empty">
            {doc.status === 'failed' ? 'Wiki not generated — ingestion failed.' : 'Wiki generation in progress…'}
          </div>
        )}
        {tab === 'raw' && (
          <>
            <h3>Source excerpt</h3>
            <div className="detail-raw">{doc.raw ?? '— no raw text available —'}</div>
          </>
        )}
        {tab === 'meta' && (
          <dl className="kv-grid">
            <dt>file_type</dt><dd>{doc.fileType}</dd>
            <dt>status</dt><dd>{doc.status}</dd>
            <dt>pages</dt><dd>{doc.pages}</dd>
            <dt>size</dt><dd>{doc.size}</dd>
            <dt>added</dt><dd>{doc.addedAt}</dd>
            <dt>conflict</dt><dd>{doc.hasConflict ? 'flagged' : 'none'}</dd>
            <dt>storage_path</dt><dd style={{ color: 'var(--text-secondary)' }}>/u/{doc.id}.bin</dd>
            <dt>embeddings</dt>
            <dd>{doc.status === 'ready' ? `${doc.pages * 7} chunks · OpenAI 3-large` : '—'}</dd>
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
