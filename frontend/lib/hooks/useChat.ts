'use client'
import { useCallback, useRef } from 'react'
import { EventType } from '@ag-ui/client'
import { createChatAgent } from '@/lib/agentClient'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import type { AgentMessage, A2UIMessage, HITLMessage } from '@/lib/types'

interface A2UIBuffer {
  component?: string
  agentMsgsBefore?: Set<string>
}

const CONFLICT_LABELS: Record<string, string> = {
  duplicate: 'Duplicate content',
  outdated: 'Outdated document',
  contradictory: 'Contradictory information',
}

function nowTs() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function useChat() {
  const textBuf = useRef<Record<string, string>>({})
  const a2uiBuf = useRef<Record<string, A2UIBuffer>>({})
  const suppressMsg = useRef<Set<string>>(new Set())

  const makeHandlers = useCallback(() => {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next(event: any) {
        const { addMessage, updateMessage, setMessages, setIsStreaming, setPendingHITL } =
          useAppStore.getState()

        switch (event.type) {
          case EventType.TEXT_MESSAGE_START: {
            if (suppressMsg.current.has('next')) {
              suppressMsg.current.delete('next')
              suppressMsg.current.add(event.messageId)
              break
            }
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
            if (suppressMsg.current.has(event.messageId)) break
            textBuf.current[event.messageId] =
              (textBuf.current[event.messageId] ?? '') + event.delta
            updateMessage(event.messageId, { md: textBuf.current[event.messageId] })
            break
          }
          case EventType.TEXT_MESSAGE_END: {
            suppressMsg.current.delete(event.messageId)
            delete textBuf.current[event.messageId]
            break
          }
          case EventType.CUSTOM: {
            if (event.name === 'on_interrupt') {
              const val = event.value as Record<string, unknown>
              const conflictType = (val.conflict_type as string) ?? ''
              const docs = (
                val.documents as Array<{ id: string; title: string; created_at: string }>
              ) ?? []
              setMessages((m) => m.filter((x) => x.role !== 'typing'))
              addMessage({
                id: 'hitl-' + (val.conflict_id as string),
                role: 'hitl',
                ts: nowTs(),
                conflictType,
                title: CONFLICT_LABELS[conflictType] ?? conflictType,
                explanation: '',
                sources: docs.map((d) => ({ id: d.id, name: d.title, date: d.created_at })),
                recommend: (val.recommendation as string) ?? '',
              } satisfies HITLMessage)
              setPendingHITL(true)
              break
            }
            if (event.name !== 'a2ui_message') break
            const val = event.value as Record<string, unknown>

            if (val.createSurface) {
              const { surfaceId } = val.createSurface as { surfaceId: string }
              const agentMsgsBefore = new Set(
                useAppStore.getState().messages.filter((m) => m.role === 'agent').map((m) => m.id)
              )
              a2uiBuf.current[surfaceId] = { agentMsgsBefore }
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
                const before = buf.agentMsgsBefore
                setMessages((msgs) => {
                  const filtered = before
                    ? msgs.filter((m) => m.role !== 'agent' || before.has(m.id))
                    : msgs
                  return [
                    ...filtered,
                    {
                      id: 'a2ui-' + surfaceId,
                      role: 'a2ui',
                      ts: nowTs(),
                      component: buf.component!,
                      data: value,
                    } satisfies A2UIMessage,
                  ]
                })
                delete a2uiBuf.current[surfaceId]
                suppressMsg.current.add('next')
              }
            }
            break
          }
          case EventType.RUN_FINISHED: {
            setMessages((m) => m.filter((x) => x.role !== 'typing'))
            suppressMsg.current.clear()
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
            suppressMsg.current.clear()
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
    }
  }, [])

  const send = useCallback(async (text: string) => {
    const { messages, threadId, addMessage, setIsStreaming } =
      useAppStore.getState()

    const ts = nowTs()
    const userMsgId = 'u' + Date.now()

    addMessage({ id: userMsgId, role: 'user', content: text, ts })
    addMessage({ id: 'typing', role: 'typing' })
    setIsStreaming(true)

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
      .subscribe(makeHandlers())

    return () => sub.unsubscribe()
  }, [makeHandlers])

  const resolveHITL = useCallback(async (
    action: string,
    preferredDocId?: string,
    notes?: string,
  ) => {
    const { threadId, addMessage, setIsStreaming, setPendingHITL } =
      useAppStore.getState()

    setPendingHITL(false)
    addMessage({ id: 'typing', role: 'typing' })
    setIsStreaming(true)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

    const agent = createChatAgent(token)

    const sub = agent
      .run({
        threadId: threadId ?? crypto.randomUUID(),
        runId: 'r' + Date.now(),
        messages: [],
        state: {},
        tools: [],
        context: [],
        forwardedProps: {
          command: {
            resume: {
              action,
              preferred_document_id: preferredDocId ?? null,
              notes: notes ?? null,
            },
          },
        },
      })
      .subscribe(makeHandlers())

    return () => sub.unsubscribe()
  }, [makeHandlers])

  return { send, resolveHITL }
}
