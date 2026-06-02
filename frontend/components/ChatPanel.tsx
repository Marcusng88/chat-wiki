'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useChatStore } from '@/store/useChatStore'
import { useDocumentStore } from '@/store/useDocumentStore'
import { useUIStore } from '@/store/useUIStore'
import { useConfirm } from '@/lib/hooks/useConfirm'
import { useChat } from '@/lib/hooks/useChat'
import { DOCUMENT_STATUS } from '@/lib/types'
import MessageItem from './MessageItem'
import { Plus, Send, Sparkle } from './Icons'

const STARTERS = [
  'Summarize my sources',
  'What do these documents disagree on?',
  'Give me the key takeaways',
]

export default function ChatPanel() {
  const { messages, isStreaming, pendingHITL, clearMessages } = useChatStore()
  const { documents, openDocument } = useDocumentStore()
  const { setLeftCollapsed } = useUIStore()
  const chat = useChat()
  const requestConfirm = useConfirm()
  const [input, setInput] = useState('')
  const inputRef = useRef('')
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
    const text = (typeof textOverride === 'string' ? textOverride : inputRef.current).trim()
    if (!text || isStreaming || pendingHITL) return
    inputRef.current = ''
    setInput('')
    chat.send(text)
  }, [isStreaming, pendingHITL, chat])

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

  const readyCount = documents.filter((d) => d.status === DOCUMENT_STATUS.READY).length

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
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="ce-glyph"><Sparkle width={22} height={22} /></div>
            {readyCount === 0 ? (
              <>
                <div className="ce-title">Add your sources.</div>
                <div className="ce-sub">Upload a document and I’ll answer with citations.</div>
                <div className="suggestion-chips">
                  <button className="suggestion-chip" onClick={() => setLeftCollapsed(false)}>
                    <span className="arrow">↗</span> Reveal sources panel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="ce-title">Ask your knowledge.</div>
                <div className="ce-sub">
                  <span className="num">{readyCount}</span> {readyCount === 1 ? 'source' : 'sources'} indexed · answers come cited
                </div>
                <div className="suggestion-chips">
                  {STARTERS.map((s) => (
                    <button key={s} className="suggestion-chip" onClick={() => send(s)}>
                      <span className="arrow">↗</span> {s}
                    </button>
                  ))}
                </div>
                <div className="ce-cap">
                  cited <span className="dot" /> conflict-aware <span className="dot" /> {readyCount} in scope
                </div>
              </>
            )}
          </div>
        ) : (
          messages.map((m) => (
            <MessageItem
              key={m.id}
              msg={m}
              onOpenDoc={openDoc}
              onResolveHitl={resolveHITL}
              onQuery={send}
            />
          ))
        )}
      </div>

      <div className="chat-input-wrap">
        <div className={`chat-input${isStreaming || pendingHITL ? ' disabled' : ''}`}>
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => { inputRef.current = e.target.value; setInput(e.target.value) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder={
              isStreaming
                ? 'agent is responding…'
                : pendingHITL
                ? 'resolve the conflict card above to continue…'
                : 'ask about your knowledge — enter to send, shift+enter newline'
            }
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
