'use client'

import { useRef, useState } from 'react'

const ACCEPTED = '.pdf,.md,.txt,.pptx,.png,.jpg,.jpeg'
const ACCEPTED_LABEL = 'PDF, MD, TXT, PPTX, Images'

export default function UploadZone() {
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(true)
  }

  function onDragLeave() {
    setDragActive(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
  }

  return (
    <div
      data-testid="upload-zone"
      data-drag-active={dragActive}
      className="m-3 rounded-lg border-2 border-dashed p-4 text-center transition-colors"
      style={{
        borderColor: dragActive ? 'var(--accent)' : 'var(--border)',
        background: dragActive ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <p
        className="mb-2 text-xs upload-drag-hint"
        style={{ color: 'var(--fg-muted)' }}
      >
        Drop files here
      </p>

      <button
        className="rounded px-3 py-1.5 text-xs font-medium transition-colors"
        style={{ background: 'var(--accent)', color: '#000' }}
        onClick={() => inputRef.current?.click()}
      >
        Choose File
      </button>

      <p className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
        {ACCEPTED_LABEL}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="sr-only"
        aria-label="Upload files"
      />
    </div>
  )
}
