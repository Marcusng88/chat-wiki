'use client'
import { Renderer } from '@openuidev/react-lang'
import { openuiChatLibrary } from '@openuidev/react-ui/genui-lib'

interface Props {
  content: string
  isStreaming?: boolean
  onAction?: (event: unknown) => void
}

export default function OpenUIRenderer({ content, isStreaming = false, onAction }: Props) {
  return (
    <Renderer
      response={content}
      library={openuiChatLibrary}
      isStreaming={isStreaming}
      onAction={onAction}
    />
  )
}
