'use client'

import { useRef, useState } from 'react'

const ACCEPTED = '.pdf,.md,.txt,.pptx,.png,.jpg,.jpeg'

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
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="mx-3 my-2 cursor-pointer select-none rounded border transition-all duration-150"
      style={{
        borderColor: dragActive ? 'var(--accent)' : 'var(--border)',
        borderStyle: 'dashed',
        background: dragActive
          ? 'color-mix(in srgb, var(--accent) 6%, transparent)'
          : 'transparent',
        padding: '12px',
      }}
      onClick={() => inputRef.current?.click()}
    >
      <div className="flex flex-col items-center gap-2">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ color: dragActive ? 'var(--accent)' : 'var(--fg-muted)' }}
        >
          <path d="M10 13V4M10 4L7 7M10 4l3 3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" strokeLinecap="round" />
        </svg>

        <p
          className="upload-drag-hint text-center text-xs"
          style={{ color: dragActive ? 'var(--accent)' : 'var(--fg-muted)', letterSpacing: '0.02em' }}
        >
          {dragActive ? 'release to upload' : 'drag files or click'}
        </p>

        <p
          className="text-center font-mono"
          style={{ color: 'var(--fg-muted)', fontSize: '10px', opacity: 0.6 }}
        >
          PDF · MD · TXT · PPTX · Images
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="sr-only"
        aria-label="Upload files"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
