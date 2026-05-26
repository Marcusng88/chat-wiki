'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Message } from '@/lib/types'

export default function MessageItem({ msg }: { msg: Message }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[72%] rounded-xl px-4 py-2.5 text-sm leading-relaxed"
          style={{
            background: 'var(--accent)',
            color: '#000',
            fontFamily: 'var(--font-body)',
          }}
        >
          {msg.content}
        </div>
      </div>
    )
  }

  if (msg.role === 'agent') {
    return (
      <div className="flex justify-start gap-2">
        <div
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-xs"
          style={{ background: 'var(--surface-hover)', color: 'var(--accent)', fontSize: '9px' }}
        >
          AI
        </div>
        <div
          className="prose-sm max-w-[80%] text-sm leading-relaxed"
          style={{
            color: 'var(--fg)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              code: ({ children, className }) => {
                const isBlock = className?.includes('language-')
                return isBlock ? (
                  <code
                    className={className}
                    style={{
                      display: 'block',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      overflowX: 'auto',
                    }}
                  >
                    {children}
                  </code>
                ) : (
                  <code
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '3px',
                      padding: '1px 5px',
                      fontSize: '12px',
                      color: 'var(--accent)',
                    }}
                  >
                    {children}
                  </code>
                )
              },
              ul: ({ children }) => (
                <ul style={{ paddingLeft: '16px', marginBottom: '8px' }}>{children}</ul>
              ),
              li: ({ children }) => (
                <li style={{ marginBottom: '2px', color: 'var(--fg)' }}>{children}</li>
              ),
              strong: ({ children }) => (
                <strong style={{ color: 'var(--fg)', fontWeight: 600 }}>{children}</strong>
              ),
            }}
          >
            {msg.role === 'agent' ? (msg.md ?? '') : ''}
          </ReactMarkdown>
        </div>
      </div>
    )
  }

  if (msg.role === 'typing') {
    return (
      <div data-testid="msg-typing" className="flex justify-start gap-2 items-center py-1">
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono"
          style={{ background: 'var(--surface-hover)', color: 'var(--accent)', fontSize: '9px' }}
        >
          AI
        </div>
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block rounded-full"
              style={{
                width: '5px',
                height: '5px',
                background: 'var(--fg-muted)',
                animation: 'bounce 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (msg.role === 'hitl') {
    return (
      <div
        data-testid="msg-hitl"
        className="rounded border-l-2 py-3 pl-4 pr-3 text-xs"
        style={{
          borderLeftColor: 'var(--color-status-processing)',
          background: 'var(--surface)',
          color: 'var(--fg-muted)',
          fontFamily: 'var(--font-body)',
        }}
      >
        <span style={{ color: 'var(--color-status-processing)', fontWeight: 500 }}>
          HITL
        </span>
        {' — Phase 2'}
      </div>
    )
  }

  return null
}
