'use client'
import { useCallback, useRef } from 'react'
import { EventType } from '@ag-ui/client'
import { createChatAgent } from '@/lib/agentClient'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import type { AgentMessage, A2UIMessage } from '@/lib/types'

interface A2UIBuffer {
  component?: string
}

function nowTs() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function useChat() {
  const textBuf = useRef<Record<string, string>>({})
  const a2uiBuf = useRef<Record<string, A2UIBuffer>>({})

  const send = useCallback(async (text: string) => {
    const { messages, threadId, addMessage, setIsStreaming } =
      useAppStore.getState()

    const ts = nowTs()
    const userMsgId = 'u' + Date.now()

    addMessage({ id: userMsgId, role: 'user', content: text, ts })
    addMessage({ id: 'typing', role: 'typing' })
    setIsStreaming(true)

    // Build AG-UI message history (user + agent only)
    const agMessages = [
      ...messages
        .filter((m) => m.role === 'user' || m.role === 'agent')
        .map((m) => ({
          id: m.id,
          role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.role === 'user' ? (m as { content: string }).content : (m as AgentMessage).md ?? '',
        })),
      { id: userMsgId, role: 'user' as const, content: text },
    ]

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

    const agent = createChatAgent(token)

    const sub = agent
      .run({
        threadId: threadId ?? crypto.randomUUID(),
        runId: 'r' + Date.now(),
        messages: agMessages,
        state: {},
        tools: [],
        context: [],
        forwardedProps: {},
      })
      .subscribe({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        next(event: any) {
          const { addMessage, updateMessage, setMessages, setIsStreaming } = useAppStore.getState()

          switch (event.type) {
            case EventType.TEXT_MESSAGE_START: {
              textBuf.current[event.messageId] = ''
              setMessages((m) => [
                ...m.filter((x) => x.role !== 'typing'),
                {
                  id: event.messageId,
                  role: 'agent',
                  ts: nowTs(),
                  md: '',
                  sources: [],
                } satisfies AgentMessage,
              ])
              break
            }
            case EventType.TEXT_MESSAGE_CONTENT: {
              textBuf.current[event.messageId] =
                (textBuf.current[event.messageId] ?? '') + event.delta
              updateMessage(event.messageId, { md: textBuf.current[event.messageId] })
              break
            }
            case EventType.TEXT_MESSAGE_END: {
              delete textBuf.current[event.messageId]
              break
            }
            case EventType.CUSTOM: {
              if (event.name !== 'a2ui_message') break
              const val = event.value as Record<string, unknown>

              if (val.createSurface) {
                const { surfaceId } = val.createSurface as { surfaceId: string }
                a2uiBuf.current[surfaceId] = {}
              } else if (val.updateComponents) {
                const { surfaceId, components } = val.updateComponents as {
                  surfaceId: string
                  components: Array<{ id: string; component: string }>
                }
                if (a2uiBuf.current[surfaceId]) {
                  a2uiBuf.current[surfaceId].component = components[0]?.component
                }
              } else if (val.updateDataModel) {
                const { surfaceId, value } = val.updateDataModel as {
                  surfaceId: string
                  path: string
                  value: Record<string, unknown>
                }
                const buf = a2uiBuf.current[surfaceId]
                if (buf?.component) {
                  addMessage({
                    id: 'a2ui-' + surfaceId,
                    role: 'a2ui',
                    ts: nowTs(),
                    component: buf.component,
                    data: value,
                  } satisfies A2UIMessage)
                  delete a2uiBuf.current[surfaceId]
                }
              }
              break
            }
            case EventType.RUN_FINISHED: {
              // Remove any lingering typing indicator (e.g. if no text was emitted)
              setMessages((m) => m.filter((x) => x.role !== 'typing'))
              setIsStreaming(false)
              break
            }
            case EventType.RUN_ERROR: {
              setMessages((m) => [
                ...m.filter((x) => x.role !== 'typing'),
                {
                  id: 'err' + Date.now(),
                  role: 'agent',
                  ts: nowTs(),
                  md: `Something went wrong. Try again.`,
                  sources: [],
                } satisfies AgentMessage,
              ])
              setIsStreaming(false)
              break
            }
          }
        },
        error() {
          const { setMessages, setIsStreaming } = useAppStore.getState()
          setMessages((m) => [
            ...m.filter((x) => x.role !== 'typing'),
            {
              id: 'err' + Date.now(),
              role: 'agent',
              ts: nowTs(),
              md: 'Something went wrong. Try again.',
              sources: [],
            } satisfies AgentMessage,
          ])
          setIsStreaming(false)
        },
      })

    return () => sub.unsubscribe()
  }, [])

  return { send }
}
