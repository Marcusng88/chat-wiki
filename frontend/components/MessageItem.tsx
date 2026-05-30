'use client'
import { memo, useCallback } from 'react'
import type { AgentMessage, Message, MessageSource } from '@/lib/types'
import { useChatStore } from '@/store/useChatStore'
import HITLCard from './HITLCard'
import OpenUIRenderer from './OpenUIRenderer'
import ToolCallStream from './ToolCallStream'

interface Props {
  msg: Message
  onOpenDoc?: (docId: string) => void
  onResolveHitl?: (choice: string, notes?: string) => void
  onQuery?: (text: string) => void
}

function MessageItem({ msg, onOpenDoc, onResolveHitl, onQuery }: Props) {
  const openDoc = onOpenDoc ?? (() => {})
  const isStreaming = useChatStore((s) => s.isStreaming)

  const handleAction = useCallback((event: unknown) => {
    const e = event as { type: string; humanFriendlyMessage?: string }
    if (e.type === 'continue_conversation' && e.humanFriendlyMessage) {
      const msg = e.humanFriendlyMessage
      if (msg.startsWith('__cite__:') && onOpenDoc) {
        onOpenDoc(msg.slice(9))
        return
      }
      if (onQuery) onQuery(msg)
    }
  }, [onQuery, onOpenDoc])

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

  // msg.role === 'agent'
  return (
    <div className="msg-row agent">
      <div className="who">
        <span>agent</span>
        <span className="ts">{msg.ts}</span>
      </div>
      <div className="msg-bubble">
        <ToolCallStream steps={msg.steps ?? []} isStreaming={isStreaming} />
        {msg.blocks.map((block) => {
          if (block.type === 'openui') {
            return (
              <div key={block.id} className="openui-block">
                <OpenUIRenderer
                  content={block.content}
                  isStreaming={isStreaming}
                  onAction={handleAction}
                />
              </div>
            )
          }
          // error block
          return (
            <div key={block.id} className="msg-error">
              {block.message}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default memo(MessageItem)
