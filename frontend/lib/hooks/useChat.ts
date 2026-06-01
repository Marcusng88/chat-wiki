'use client'

import { useCallback } from 'react'
import { EventType } from '@ag-ui/client'
import { createChatAgent } from '@/lib/agentClient'
import { createClient } from '@/lib/supabase'
import { useChatStore } from '@/store/useChatStore'
import { useDocumentStore } from '@/store/useDocumentStore'
import { listDocuments } from '@/lib/api'
import { rowToDocument } from '@/lib/hooks/useDocuments'
import { HITLPayloadSchema } from '@/lib/contract/hitl'
import type { ChatAction } from '@/lib/contract/events'
import type { OpenUIBlock } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function agUiEventToAction(event: any): ChatAction | null {
  switch (event.type) {
    case EventType.TOOL_CALL_START:
      return { type: 'TOOL_OPENED', stepId: event.toolCallId, name: event.toolCallName ?? event.toolCallId }
    case EventType.TOOL_CALL_ARGS:
      return { type: 'TOOL_ARGS', stepId: event.toolCallId, argsDelta: event.delta ?? '' }
    case EventType.TOOL_CALL_END:
      return { type: 'TOOL_CLOSED', stepId: event.toolCallId }
    case EventType.TEXT_MESSAGE_START:
      return { type: 'BLOCK_STARTED', blockId: event.messageId }
    case EventType.TEXT_MESSAGE_CONTENT:
      return { type: 'BLOCK_DELTA', blockId: event.messageId, delta: event.delta ?? '' }
    case EventType.TEXT_MESSAGE_END:
      return { type: 'BLOCK_CLOSED', blockId: event.messageId }
    case EventType.RUN_FINISHED:
      return { type: 'RUN_FINISHED' }
    case EventType.RUN_ERROR:
      return { type: 'RUN_ERROR', message: event.message ?? 'Unknown error' }
    case EventType.CUSTOM: {
      if (event.name !== 'on_interrupt') return null
      // ag_ui_langgraph emits the interrupt value JSON-stringified (dump_json_safe),
      // so event.value arrives as a string. Tolerate a raw object too in case a
      // future adapter version stops stringifying.
      let raw: unknown = event.value
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw)
        } catch {
          return { type: 'RUN_ERROR', message: 'Invalid HITL payload from server' }
        }
      }
      const parsed = HITLPayloadSchema.safeParse(raw)
      if (!parsed.success) {
        return { type: 'RUN_ERROR', message: 'Invalid HITL payload from server' }
      }
      return { type: 'INTERRUPTED', hitl: parsed.data }
    }
    default:
      return null
  }
}

async function getToken(): Promise<string> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

export function useChat() {
  const send = useCallback(async (text: string) => {
    const { messages, threadId, dispatch } = useChatStore.getState()
    const msgId = 'u' + Date.now()

    dispatch({ type: 'USER_SENT', text, msgId })

    const agMessages = [
      ...messages
        .filter((m) => m.role === 'user' || m.role === 'agent')
        .map((m) => {
          if (m.role === 'user') {
            return { id: m.id, role: 'user' as const, content: m.content }
          }
          const content = m.blocks
            .filter((b): b is OpenUIBlock => b.type === 'openui')
            .map((b) => b.content)
            .join('\n\n')
          return { id: m.id, role: 'assistant' as const, content }
        }),
      { id: msgId, role: 'user' as const, content: text },
    ]

    const token = await getToken()
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
        next(event: any) {
          const action = agUiEventToAction(event)
          if (action) useChatStore.getState().dispatch(action)
        },
        error() {
          useChatStore.getState().dispatch({ type: 'RUN_ERROR', message: 'Connection error. Try again.' })
        },
      })

    return () => sub.unsubscribe()
  }, [])

  const resolveHITL = useCallback(
    async (action: string, preferredDocId?: string, notes?: string) => {
      const { threadId, dispatch } = useChatStore.getState()

      dispatch({ type: 'RESUMING' })

      const token = await getToken()
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
         
        .subscribe({
          next(event: any) {
            const chatAction = agUiEventToAction(event)
            if (!chatAction) return
            useChatStore.getState().dispatch(chatAction)
            // Resolving a conflict mutates conflicts.status server-side. Refetch
            // documents so the left-panel flag clears without a manual refresh.
            if (chatAction.type === 'RUN_FINISHED') {
              listDocuments()
                .then((rows) => useDocumentStore.getState().setDocuments(rows.map(rowToDocument)))
                .catch((e) => console.error('resolveHITL doc refresh failed', e))
            }
          },
          error() {
            useChatStore.getState().dispatch({ type: 'RUN_ERROR', message: 'Connection error. Try again.' })
          },
        })

      return () => sub.unsubscribe()
    },
    [],
  )

  return { send, resolveHITL }
}
