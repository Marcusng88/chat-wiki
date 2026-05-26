'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import MessageItem from './MessageItem'

export default function ChatPanel() {
  const { messages, clearMessages, setIsMobileDrawerOpen } = useAppStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleNewChat() {
    const newThreadId = crypto.randomUUID()
    clearMessages(newThreadId)
    fetch('/api/thread', { method: 'DELETE' }).catch(() => {})
  }

  return (
    <>
      <header
        className="flex shrink-0 items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          aria-label="Open menu"
          className="md:hidden flex items-center justify-center"
          onClick={() => setIsMobileDrawerOpen(true)}
          style={{ color: 'var(--fg-muted)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect y="2" width="16" height="1.5" rx="0.75" />
            <rect y="7.25" width="16" height="1.5" rx="0.75" />
            <rect y="12.5" width="16" height="1.5" rx="0.75" />
          </svg>
        </button>

        <span
          className="flex-1 text-sm font-bold tracking-wide"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
        >
          Chat Wiki
        </span>

        <button
          onClick={handleNewChat}
          className="rounded border px-3 py-1 font-mono transition-colors"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--fg-muted)',
            fontSize: '11px',
            letterSpacing: '0.03em',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.borderColor = 'var(--fg-muted)'
            el.style.color = 'var(--fg)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.borderColor = 'var(--border)'
            el.style.color = 'var(--fg-muted)'
          }}
        >
          new chat
        </button>
      </header>

      <div
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5"
        style={{ background: 'var(--bg)' }}
      >
        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 opacity-40">
            <div
              className="font-mono text-xs"
              style={{ color: 'var(--fg-muted)', letterSpacing: '0.08em' }}
            >
              NO MESSAGES
            </div>
            <div
              className="h-px w-16"
              style={{ background: 'var(--border)' }}
            />
            <div
              className="font-mono text-xs text-center"
              style={{ color: 'var(--fg-muted)', maxWidth: '200px', lineHeight: 1.6 }}
            >
              upload materials and start a conversation
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <MessageItem key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
    </>
  )
}
