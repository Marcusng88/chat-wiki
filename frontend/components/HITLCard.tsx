'use client'
import { useState } from 'react'
import type { HITLMessage } from '@/lib/types'
import { Check } from './Icons'
import Markdown from './Markdown'

interface Props {
  msg: HITLMessage
  onResolve?: (choice: string, notes?: string) => void
}

export default function HITLCard({ msg, onResolve }: Props) {
  const [picked, setPicked] = useState(msg.recommendedId ?? msg.sources[0]?.id ?? '')
  const [done, setDone] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [note, setNote] = useState('')

  if (!msg.sources?.length) return null

  if (done) {
    const pickedSrc = msg.sources.find((s) => s.id === picked)
    return (
      <div
        className="hitl-card"
        style={{ borderColor: 'rgba(34,197,94,0.30)', background: 'rgba(34,197,94,0.04)' }}
      >
        <div
          className="hitl-head"
          style={{ background: 'rgba(34,197,94,0.06)', borderBottomColor: 'rgba(34,197,94,0.20)' }}
        >
          <span className="badge" style={{ background: 'var(--status-ready)' }}>got it</span>
          <span className="title">Saved your choice</span>
        </div>
        <div className="hitl-body" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          ✓ From now on I&apos;ll lean on{' '}
          <code style={{ color: 'var(--status-ready)' }}>{pickedSrc?.name}</code>{' '}
          for this topic. The other file stays in your library, untouched.
        </div>
      </div>
    )
  }

  return (
    <div className="hitl-card">
      <div className="hitl-head">
        <span className="badge">needs your call</span>
        <span className="title">{msg.title}</span>
        <span className="req-id">paused</span>
      </div>
      <div className="hitl-body">
        {msg.explanation && (
          <div className="hitl-conflict-detail">
            <span className="hitl-section-label">What&apos;s conflicting</span>
            <Markdown md={msg.explanation} onCite={() => {}} />
          </div>
        )}
        <div className="hitl-sources">
          {msg.sources.map((s) => (
            <div
              key={s.id}
              className={`hitl-source${picked === s.id ? ' selected' : ''}`}
              onClick={() => setPicked(s.id)}
            >
              {s.id === msg.recommendedId && <span className="rec-tag">recommended</span>}
              <span className="name">{s.name}</span>
              {s.stance && <span className="stance">{s.stance}</span>}
              <span className="date">{s.date}</span>
              <span className="check"><Check /></span>
            </div>
          ))}
        </div>
        <div className="hitl-recommend">
          <Markdown md={`**Recommendation —** ${msg.recommend}`} onCite={() => {}} />
        </div>
        {showNoteInput ? (
          <div className="hitl-note-wrap">
            <textarea
              className="hitl-note-input"
              placeholder="Describe what you'd like changed…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              autoFocus
            />
            <div className="hitl-actions">
              <button
                className="hitl-btn primary"
                disabled={!note.trim()}
                onClick={() => { setDone(true); onResolve?.('modify', note.trim()) }}
              >
                Send note
              </button>
              <button className="hitl-btn" onClick={() => setShowNoteInput(false)}>
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="hitl-actions">
            <button
              className="hitl-btn primary"
              onClick={() => { setDone(true); onResolve?.(picked) }}
            >
              <Check /> Use this one
            </button>
            <button className="hitl-btn" onClick={() => setShowNoteInput(true)}>
              Change something
            </button>
            <button className="hitl-btn danger" onClick={() => { setDone(true); onResolve?.('reject') }}>
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
