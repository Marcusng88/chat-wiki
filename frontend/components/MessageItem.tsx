'use client'
import type { Message, MessageSource } from '@/lib/types'
import Markdown from './Markdown'
import SourcePill from './SourcePill'
import HITLCard from './HITLCard'
import A2UICard from './A2UICard'
import A2UIRenderer from './A2UIRenderer'
import { Sparkle } from './Icons'

export interface Suggestion {
  text: string
  onPick: (text: string) => void
}

interface Props {
  msg: Message
  onOpenDoc?: (docId: string) => void
  onResolveHitl?: (choice: string) => void
  suggestions?: Suggestion[] | null
}

export default function MessageItem({ msg, onOpenDoc, onResolveHitl, suggestions }: Props) {
  const openDoc = onOpenDoc ?? (() => {})

  if (msg.role === 'user') {
    return (
      <div className="msg-row user">
        <div className="who">
          <span>you</span>
          <span className="ts">{msg.ts}</span>
        </div>
        <div className="msg-bubble">{msg.content}</div>
      </div>
    )
  }

  if (msg.role === 'typing') {
    return (
      <div className="msg-row agent">
        <div className="who">
          <span>agent</span>
          <span className="ts">retrieving…</span>
        </div>
        <div className="typing"><span /><span /><span /></div>
      </div>
    )
  }

  if (msg.role === 'a2ui') {
    return (
      <div className="msg-row agent">
        <div className="who">
          <span>agent</span>
          <span className="ts">{msg.ts}</span>
        </div>
        <A2UIRenderer component={msg.component} data={msg.data} />
      </div>
    )
  }

  if (msg.role === 'hitl') {
    return (
      <div className="msg-row agent" style={{ width: '100%' }}>
        <div className="who" style={{ color: 'var(--status-conflict)' }}>
          <span>agent · paused</span>
          <span className="ts">{msg.ts}</span>
        </div>
        <div style={{ width: '100%', maxWidth: 640 }}>
          <HITLCard msg={msg} onResolve={onResolveHitl} />
        </div>
      </div>
    )
  }

  // agent
  return (
    <div className="msg-row agent">
      <div className="who">
        <span>agent</span>
        <span className="ts">{msg.ts}</span>
      </div>
      <div className="msg-bubble">
        <Markdown
          md={msg.md}
          onCite={(idx) => {
            const src = (msg.sources ?? []).find((s: MessageSource) => s.idx === idx)
            if (src) openDoc(src.docId)
          }}
          sources={msg.sources}
        />
        {msg.a2ui && <A2UICard payload={msg.a2ui} />}
        {msg.sources && msg.sources.length > 0 && (
          <div className="sources-row">
            <span className="sources-label">sources</span>
            {msg.sources.map((s) => (
              <SourcePill key={s.idx} src={s} onOpen={openDoc} />
            ))}
          </div>
        )}
        {suggestions && suggestions.length > 0 && (
          <div className="followup-tray">
            <div className="suggestion-label">
              <Sparkle />
              <span>follow up</span>
            </div>
            <div className="suggestion-chips">
              {suggestions.map((s) => (
                <button key={s.text} className="suggestion-chip" onClick={() => s.onPick(s.text)}>
                  <span className="arrow">↗</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
