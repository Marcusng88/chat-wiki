'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useConfirm } from '@/lib/hooks/useConfirm'
import MessageItem from './MessageItem'
import { Plus, Send } from './Icons'

const SUGGESTIONS = [
  'summarize my notes on attention variants',
  'what changed between april and may decisions?',
  'find every mention of HITL approval flow',
]

export default function ChatPanel() {
  const {
    messages,
    setMessages,
    documents,
    isStreaming,
    setIsStreaming,
    clearMessages,
    openDocument,
    setLeftCollapsed,
  } = useAppStore()
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
    if (!text || isStreaming) return
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setMessages((m) => [
      ...m,
      { id: 'u' + Date.now(), role: 'user' as const, content: text, ts: now },
      { id: 't' + Date.now(), role: 'typing' as const },
    ])
    setInput('')
    setIsStreaming(true)

    setTimeout(() => {
      setMessages((m) => {
        const filtered = m.filter((x) => x.role !== 'typing')
        const ready = documents.filter((d) => d.status === 'ready')
        const first = ready[0] ?? documents[0]
        const reply = {
          id: 'a' + Date.now(),
          role: 'agent' as const,
          ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          md: first
            ? `Based on your library, the most relevant material is **${first.title}** [[1]](#s1). Here's what I found:\n\n- Wiki page is *ready* and was last regenerated when you uploaded the file.\n- No conflicting claims with newer sources on this specific topic.\n- I can pull a deeper excerpt or open the raw source — just ask.`
            : `I don't see any ready documents in your library yet. Upload some files and I'll be able to answer questions from them.`,
          sources: first
            ? [{ idx: 1, docId: first.id, name: first.title, loc: '§ 1', snippet: 'Most relevant section pulled from this document.' }]
            : [],
        }
        return [...filtered, reply]
      })
      setIsStreaming(false)
    }, 1600)
  }, [input, isStreaming, setMessages, setIsStreaming, documents])

  const handleNewChat = useCallback(async () => {
    const ok = await requestConfirm({
      title: 'Start a new chat?',
      message: 'This conversation will close, but your files stay where they are.',
      confirmText: 'New chat',
      cancelText: 'Keep this one',
    })
    if (!ok) return
    clearMessages(crypto.randomUUID())
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
          const isLastAgent =
            m.role === 'agent' &&
            !isStreaming &&
            messages.slice(idx + 1).every((x) => x.role !== 'agent' && x.role !== 'hitl' && x.role !== 'typing')
          return (
            <MessageItem
              key={m.id}
              msg={m}
              onOpenDoc={openDoc}
              onResolveHitl={() => {}}
              suggestions={isLastAgent ? SUGGESTIONS.map((s) => ({ text: s, onPick: send })) : null}
            />
          )
        })}
      </div>

      <div className="chat-input-wrap">
        <div className={`chat-input${isStreaming ? ' disabled' : ''}`}>
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder={isStreaming ? 'agent is responding…' : 'ask about your knowledge — enter to send, shift+enter newline'}
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
              disabled={!input.trim() || isStreaming}
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
