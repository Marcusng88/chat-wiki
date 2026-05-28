'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useConfirm } from '@/lib/hooks/useConfirm'
import { useChat } from '@/lib/hooks/useChat'
import MessageItem from './MessageItem'
import { Plus, Send } from './Icons'

export default function ChatPanel() {
  const {
    messages,
    documents,
    isStreaming,
    pendingHITL,
    clearMessages,
    openDocument,
    setLeftCollapsed,
  } = useAppStore()
  const chat = useChat()
  const requestConfirm = useConfirm()
  const [input, setInput] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, isStreaming])

  const autoSize = useCallback(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(132, Math.max(22, ta.scrollHeight)) + 'px'
  }, [])

  useEffect(() => { autoSize() }, [input, autoSize])

  const openDoc = useCallback((id: string) => {
    setLeftCollapsed(false)
    openDocument(id)
  }, [setLeftCollapsed, openDocument])

  const send = useCallback((textOverride?: string) => {
    const text = (typeof textOverride === 'string' ? textOverride : input).trim()
    if (!text || isStreaming || pendingHITL) return
    setInput('')
    chat.send(text)
  }, [input, isStreaming, pendingHITL, chat])

  const resolveHITL = useCallback((choice: string, notes?: string) => {
    if (choice === 'reject') {
      chat.resolveHITL('reject')
    } else if (choice === 'modify') {
      chat.resolveHITL('modify', undefined, notes)
    } else {
      chat.resolveHITL('approve', choice)
    }
  }, [chat])

  const handleNewChat = useCallback(async () => {
    const ok = await requestConfirm({
      title: 'Start a new chat?',
      message: 'This conversation will close, but your files stay where they are.',
      confirmText: 'New chat',
      cancelText: 'Keep this one',
    })
    if (!ok) return
    await clearMessages()
  }, [requestConfirm, clearMessages])

  const readyCount = documents.filter((d) => d.status === 'ready').length

  return (
    <>
      <div className="panel-header">
        <span className="label">Chat</span>
        <div className="meta">
          <button className="ghost-btn primary" onClick={handleNewChat}>
            <Plus />
            <span>New chat</span>
          </button>
        </div>
      </div>

      <div className="chat-body" ref={bodyRef}>
        {messages.map((m, idx) => {
          return (
            <MessageItem
              key={m.id}
              msg={m}
              onOpenDoc={openDoc}
              onResolveHitl={resolveHITL}
              onQuery={send}
            />
          )
        })}
      </div>

      <div className="chat-input-wrap">
        <div className={`chat-input${isStreaming || pendingHITL ? ' disabled' : ''}`}>
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder={isStreaming ? 'agent is responding…' : pendingHITL ? 'resolve the conflict card above to continue…' : 'ask about your knowledge — enter to send, shift+enter newline'}
            rows={1}
          />
          <div className="chat-input-bottom">
            <span className="scope-chip">
              <span className="pip" />
              {readyCount} sources in scope
            </span>
            <span className="hint">⏎ send · ⇧⏎ newline</span>
            <button
              className="send"
              onClick={() => send()}
              disabled={!input.trim() || isStreaming || pendingHITL}
              aria-label="Send"
            >
              <Send />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
