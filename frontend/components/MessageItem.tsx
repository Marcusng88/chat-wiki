'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Message } from '@/store/useAppStore'

export default function MessageItem({ msg }: { msg: Message }) {
  if (msg.type === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[75%] rounded-2xl px-4 py-2 text-sm"
          style={{ background: 'var(--accent)', color: '#000' }}
        >
          {msg.content}
        </div>
      </div>
    )
  }

  if (msg.type === 'agent') {
    return (
      <div className="flex justify-start">
        <div
          className="prose prose-invert max-w-[75%] text-sm"
          style={{ color: 'var(--fg)' }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {msg.content ?? ''}
          </ReactMarkdown>
        </div>
      </div>
    )
  }

  if (msg.type === 'typing') {
    return (
      <div data-testid="msg-typing" className="flex justify-start gap-1 py-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-2 w-2 animate-bounce rounded-full"
            style={{
              background: 'var(--fg-muted)',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    )
  }

  if (msg.type === 'hitl') {
    return (
      <div
        data-testid="msg-hitl"
        className="rounded-lg border px-4 py-3 text-sm"
        style={{ borderColor: 'var(--accent)', color: 'var(--fg-muted)' }}
      >
        Phase 2 — HITL card
      </div>
    )
  }

  if (msg.type === 'a2ui') {
    return (
      <div
        data-testid="msg-a2ui"
        className="rounded-lg border px-4 py-3 text-sm"
        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
      >
        Phase 2 — A2UI card
      </div>
    )
  }

  return null
}
