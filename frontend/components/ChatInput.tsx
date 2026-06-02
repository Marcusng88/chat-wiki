'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Send } from './Icons'

type Props = {
  onSend: (text: string) => void
  isStreaming: boolean
  pendingHITL: boolean
  readyCount: number
}

// Owns the draft text so keystrokes re-render only this component, not the
// message list. (Previously the input state lived in ChatPanel → every key
// reconciled every message → typing lag scaling with message count.)
export default function ChatInput({ onSend, isStreaming, pendingHITL, readyCount }: Props) {
  const [input, setInput] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  const autoSize = useCallback(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(132, Math.max(22, ta.scrollHeight)) + 'px'
  }, [])

  useEffect(() => { autoSize() }, [input, autoSize])

  const submit = useCallback(() => {
    const text = input.trim()
    if (!text || isStreaming || pendingHITL) return
    setInput('')
    onSend(text)
  }, [input, isStreaming, pendingHITL, onSend])

  return (
    <div className="chat-input-wrap">
      <div className={`chat-input${isStreaming || pendingHITL ? ' disabled' : ''}`}>
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
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
            onClick={submit}
            disabled={!input.trim() || isStreaming || pendingHITL}
            aria-label="Send"
          >
            <Send />
          </button>
        </div>
      </div>
    </div>
  )
}
