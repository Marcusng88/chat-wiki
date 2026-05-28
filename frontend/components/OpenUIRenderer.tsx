'use client'
import { Renderer } from '@openuidev/react-lang'
import { customChatLibrary } from '@/lib/openui-library'

// Strip [[N]](#sN) citation markers — these are handled by the sources row,
// and OpenUI's text renderer converts them to broken Unicode circled numbers.
const CITE_RE = /\[\[(\d+)\]\]\(#s\d+\)/g

interface Props {
  content: string
  isStreaming?: boolean
  onAction?: (event: unknown) => void
}

export default function OpenUIRenderer({ content, isStreaming = false, onAction }: Props) {
  return (
    <Renderer
      response={content.replace(CITE_RE, '')}
      library={customChatLibrary}
      isStreaming={isStreaming}
      onAction={onAction}
    />
  )
}
