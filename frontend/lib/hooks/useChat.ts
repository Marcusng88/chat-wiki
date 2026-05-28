'use client'
import { useCallback, useRef } from 'react'
import { EventType } from '@ag-ui/client'
import { createChatAgent } from '@/lib/agentClient'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import { getA2uiProcessor } from '@/lib/a2uiProcessor'
import type { AgentMessage, HITLMessage, TextBlock, UserMessage } from '@/lib/types'

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
  const currentTurnId = useRef<string | null>(null)

  const ensureTurn = useCallback(() => {
    if (currentTurnId.current) return currentTurnId.current
    const { setMessages } = useAppStore.getState()
    const turnId = 'turn-' + Date.now()
    currentTurnId.current = turnId
    setMessages((m) => [
      ...m.filter((x) => x.role !== 'typing'),
      {
        id: turnId,
        role: 'agent',
        ts: nowTs(),
        blocks: [],
        sources: [],
      } satisfies AgentMessage,
    ])
    return turnId
  }, [])

  const makeHandlers = useCallback(() => {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next(event: any) {
        const { addBlock, updateTextBlock, setMessages, setIsStreaming, setPendingHITL } =
          useAppStore.getState()

        switch (event.type) {
          case EventType.TEXT_MESSAGE_START: {
            const turnId = ensureTurn()
            textBuf.current[event.messageId] = ''
            addBlock(turnId, { type: 'text', id: event.messageId, md: '' } satisfies TextBlock)
            break
          }

          case EventType.TEXT_MESSAGE_CONTENT: {
            if (!currentTurnId.current) break
            textBuf.current[event.messageId] =
              (textBuf.current[event.messageId] ?? '') + event.delta
            updateTextBlock(currentTurnId.current, event.messageId, textBuf.current[event.messageId])
            break
          }

          case EventType.TEXT_MESSAGE_END: {
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
              const { addMessage } = useAppStore.getState()
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
            const processor = getA2uiProcessor()

            if (val.createSurface) {
              const { surfaceId } = val.createSurface as { surfaceId: string }
              processor.processMessages([val as any]) // eslint-disable-line @typescript-eslint/no-explicit-any
              const turnId = ensureTurn()
              addBlock(turnId, { type: 'a2ui', surfaceId })
            } else if (val.updateComponents) {
              processor.processMessages([val as any]) // eslint-disable-line @typescript-eslint/no-explicit-any
            } else if (val.updateDataModel) {
              processor.processMessages([val as any]) // eslint-disable-line @typescript-eslint/no-explicit-any
            }
            break
          }

          case EventType.RUN_FINISHED: {
            setMessages((m) => m.filter((x) => x.role !== 'typing'))
            currentTurnId.current = null
            textBuf.current = {}
            setIsStreaming(false)
            break
          }

          case EventType.RUN_ERROR: {
            const { addMessage } = useAppStore.getState()
            setMessages((m) => m.filter((x) => x.role !== 'typing'))
            addMessage({
              id: 'err' + Date.now(),
              role: 'agent',
              ts: nowTs(),
              blocks: [{ type: 'text', id: 'err-block-' + Date.now(), md: 'Something went wrong. Try again.' }],
              sources: [],
            } satisfies AgentMessage)
            currentTurnId.current = null
            textBuf.current = {}
            setIsStreaming(false)
            break
          }
        }
      },

      error() {
        const { addMessage, setMessages, setIsStreaming } = useAppStore.getState()
        setMessages((m) => m.filter((x) => x.role !== 'typing'))
        addMessage({
          id: 'err' + Date.now(),
          role: 'agent',
          ts: nowTs(),
          blocks: [{ type: 'text', id: 'err-block-' + Date.now(), md: 'Something went wrong. Try again.' }],
          sources: [],
        } satisfies AgentMessage)
        currentTurnId.current = null
        textBuf.current = {}
        setIsStreaming(false)
      },
    }
  }, [ensureTurn])

  const send = useCallback(async (text: string) => {
    const { messages, threadId, addMessage, setIsStreaming } = useAppStore.getState()

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
          content:
            m.role === 'user'
              ? (m as UserMessage).content
              : (m as AgentMessage).blocks
                  .filter((b): b is TextBlock => b.type === 'text')
                  .map((b) => b.md)
                  .join('\n\n'),
        })),
      { id: userMsgId, role: 'user' as const, content: text },
    ]

    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
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

  const resolveHITL = useCallback(
    async (action: string, preferredDocId?: string, notes?: string) => {
      const { threadId, addMessage, setIsStreaming, setPendingHITL } = useAppStore.getState()

      setPendingHITL(false)
      addMessage({ id: 'typing', role: 'typing' })
      setIsStreaming(true)

      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
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
    },
    [makeHandlers],
  )

  return { send, resolveHITL }
}
