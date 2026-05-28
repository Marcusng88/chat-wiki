'use client'
import type { AgentMessage, Message, MessageSource, TextBlock } from '@/lib/types'
import Markdown from './Markdown'
import SourcePill from './SourcePill'
import HITLCard from './HITLCard'
import A2UIRenderer from './A2UIRenderer'
import { Sparkle } from './Icons'

export interface Suggestion {
  text: string
  onPick: (text: string) => void
}

interface Props {
  msg: Message
  onOpenDoc?: (docId: string) => void
  onResolveHitl?: (choice: string, notes?: string) => void
  onQuery?: (text: string) => void
  suggestions?: Suggestion[] | null
}

export default function MessageItem({ msg, onOpenDoc, onResolveHitl, onQuery, suggestions }: Props) {
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

  // agent — blocks model
  const agentMsg = msg as AgentMessage
  return (
    <div className="msg-row agent">
      <div className="who">
        <span>agent</span>
        <span className="ts">{agentMsg.ts}</span>
      </div>
      <div className="msg-bubble">
        {agentMsg.blocks.map((block) =>
          block.type === 'text' ? (
            <Markdown
              key={(block as TextBlock).id}
              md={(block as TextBlock).md}
              onCite={(idx) => {
                const src = (agentMsg.sources ?? []).find((s: MessageSource) => s.idx === idx)
                if (src) openDoc(src.docId)
              }}
              sources={agentMsg.sources}
            />
          ) : (
            <div key={block.surfaceId} className="a2ui-block">
              <A2UIRenderer surfaceId={block.surfaceId} />
            </div>
          )
        )}
        {agentMsg.sources && agentMsg.sources.length > 0 && (
          <div className="sources-row">
            <span className="sources-label">sources</span>
            {agentMsg.sources.map((s) => (
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
