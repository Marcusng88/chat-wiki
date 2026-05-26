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
        className="flex shrink-0 items-center gap-3 border-b px-4 py-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          aria-label="Open menu"
          className="md:hidden"
          onClick={() => setIsMobileDrawerOpen(true)}
          style={{ color: 'var(--fg)' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <rect y="3" width="20" height="2" rx="1" />
            <rect y="9" width="20" height="2" rx="1" />
            <rect y="15" width="20" height="2" rx="1" />
          </svg>
        </button>

        <span
          className="flex-1 text-sm font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
        >
          Chat Wiki
        </span>

        <button
          onClick={handleNewChat}
          className="rounded px-3 py-1 text-xs font-medium transition-colors"
          style={{ background: 'var(--surface-hover)', color: 'var(--fg)' }}
        >
          New Chat
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((msg) => (
          <MessageItem key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
    </>
  )
}
