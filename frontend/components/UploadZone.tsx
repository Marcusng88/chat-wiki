'use client'

import { useRef, useState } from 'react'
import { Upload } from './Icons'

interface Props {
  onFiles?: (files: File[]) => void
}

export default function UploadZone({ onFiles }: Props) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handle(files: FileList | null) {
    if (!files || !files.length) return
    onFiles?.(Array.from(files))
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  return (
    <div
      data-testid="upload-zone"
      className={`upload-zone${drag ? ' drag' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files) }}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="uz-icon"><Upload /></div>
      <div className="uz-title">drop files or <strong>browse</strong></div>
      <div className="uz-sub">pdf · md · txt · pptx · img</div>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => handle(e.target.files)}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
