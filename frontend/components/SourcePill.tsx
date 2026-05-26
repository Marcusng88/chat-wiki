'use client'
import { useState } from 'react'
import type { MessageSource } from '@/lib/types'
import { Eye, Link } from './Icons'

interface Props {
  src: MessageSource
  onOpen: (docId: string) => void
}

export default function SourcePill({ src, onOpen }: Props) {
  const [hover, setHover] = useState(false)
  return (
    <span
      className="source-pill"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onOpen(src.docId)}
    >
      <span className="src-idx">{src.idx}</span>
      <span>{src.name}</span>
      <Link />
      {hover && (
        <div className="popover" onClick={(e) => e.stopPropagation()}>
          <div className="head"><Eye /> {src.name}</div>
          <div className="snippet">&ldquo;{src.snippet}&rdquo;</div>
          <div className="meta-row">
            <span>{src.loc}</span>
            <span>·</span>
            <span>click to open</span>
          </div>
        </div>
      )}
    </span>
  )
}
