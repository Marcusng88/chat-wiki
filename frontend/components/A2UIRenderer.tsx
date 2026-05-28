'use client'
import { useState, useEffect } from 'react'
import { A2uiSurface, MarkdownContext } from '@a2ui/react/v0_9'
import { renderMarkdown } from '@a2ui/markdown-it'
import { getA2uiProcessor } from '@/lib/a2uiProcessor'

interface Props {
  surfaceId: string
}

export default function A2UIRenderer({ surfaceId }: Props) {
  const [surface, setSurface] = useState(
    () => getA2uiProcessor().model.getSurface(surfaceId)
  )

  useEffect(() => {
    const processor = getA2uiProcessor()
    if (!surface) {
      setSurface(processor.model.getSurface(surfaceId))
    }
    const sub = processor.onSurfaceCreated((s) => {
      if (s.id === surfaceId) setSurface(s)
    })
    return () => sub.unsubscribe()
  }, [surfaceId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!surface) {
    return (
      <div className="a2ui-loading">
        <span className="a2ui-loading-dot" />
      </div>
    )
  }

  return (
    <MarkdownContext.Provider value={renderMarkdown}>
      <A2uiSurface surface={surface as any} /> {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
    </MarkdownContext.Provider>
  )
}
