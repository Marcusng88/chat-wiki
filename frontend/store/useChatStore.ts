'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase'
import type { AgentMessage, Block, ErrorBlock, HITLMessage, Message, OpenUIBlock, ToolCallStep } from '@/lib/types'
import type { ChatAction } from '@/lib/contract/events'

const CONFLICT_LABELS: Record<string, string> = {
  duplicate: 'Duplicate content',
  outdated: 'Outdated document',
  contradictory: 'Contradictory information',
}

function nowTs() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface ChatState {
  messages: Message[]
  streamingBlocks: Record<string, string>
  streamingArgs: Record<string, string>
  currentTurnId: string | null
  isStreaming: boolean
  pendingHITL: boolean
  threadId: string | null
}

interface ChatActions {
  dispatch: (action: ChatAction) => void
  clearMessages: () => Promise<void>
  setThreadId: (id: string | null) => void
  setIsStreaming: (value: boolean) => void
  setPendingHITL: (value: boolean) => void
}

const initialState: ChatState = {
  messages: [],
  streamingBlocks: {},
  streamingArgs: {},
  currentTurnId: null,
  isStreaming: false,
  pendingHITL: false,
  threadId: null,
}

function ensureTurn(state: ChatState): { turnId: string; messages: Message[] } {
  if (state.currentTurnId) {
    return { turnId: state.currentTurnId, messages: state.messages }
  }
  const turnId = 'turn-' + Date.now()
  const messages: Message[] = [
    ...state.messages.filter((m) => m.role !== 'typing'),
    { role: 'agent', id: turnId, ts: nowTs(), blocks: [], sources: [], steps: [] } satisfies AgentMessage,
  ]
  return { turnId, messages }
}

export const useChatStore = create<ChatState & ChatActions>()((set) => ({
  ...initialState,

  dispatch: (action) =>
    set((state) => {
      switch (action.type) {
        case 'USER_SENT': {
          return {
            messages: [
              ...state.messages.filter((m) => m.role !== 'typing'),
              { role: 'user', id: action.msgId, content: action.text, ts: nowTs() },
              { role: 'typing', id: 'typing' },
            ],
            isStreaming: true,
          }
        }

        case 'TOOL_OPENED': {
          const { turnId, messages } = ensureTurn(state)
          return {
            currentTurnId: turnId,
            streamingArgs: { ...state.streamingArgs, [action.stepId]: '' },
            messages: messages.map((m) =>
              m.id === turnId && m.role === 'agent'
                ? {
                    ...m,
                    steps: [
                      ...(m.steps ?? []),
                      { id: action.stepId, name: action.name, args: {}, status: 'streaming' } satisfies ToolCallStep,
                    ],
                  }
                : m
            ),
          }
        }

        case 'TOOL_ARGS': {
          if (!state.currentTurnId) return {}
          const accumulated = (state.streamingArgs[action.stepId] ?? '') + action.argsDelta
          let parsed: Record<string, unknown> = {}
          try { parsed = JSON.parse(accumulated) } catch { /* partial JSON */ }

          const newStreamingArgs = { ...state.streamingArgs, [action.stepId]: accumulated }
          const turnId = state.currentTurnId
          return {
            streamingArgs: newStreamingArgs,
            messages: Object.keys(parsed).length
              ? state.messages.map((m) =>
                  m.id === turnId && m.role === 'agent'
                    ? {
                        ...m,
                        steps: (m.steps ?? []).map((s) =>
                          s.id === action.stepId ? { ...s, args: parsed } : s
                        ),
                      }
                    : m
                )
              : state.messages,
          }
        }

        case 'TOOL_CLOSED': {
          if (!state.currentTurnId) return {}
          const accumulated = state.streamingArgs[action.stepId] ?? '{}'
          let parsed: Record<string, unknown> = {}
          try { parsed = JSON.parse(accumulated) } catch { /* keep empty */ }

          const { [action.stepId]: _dropped, ...restArgs } = state.streamingArgs
          const turnId = state.currentTurnId
          return {
            streamingArgs: restArgs,
            messages: state.messages.map((m) =>
              m.id === turnId && m.role === 'agent'
                ? {
                    ...m,
                    steps: (m.steps ?? []).map((s) =>
                      s.id === action.stepId ? { ...s, args: parsed, status: 'done' } : s
                    ),
                  }
                : m
            ),
          }
        }

        case 'BLOCK_STARTED': {
          const { turnId, messages } = ensureTurn(state)
          return {
            currentTurnId: turnId,
            streamingBlocks: { ...state.streamingBlocks, [action.blockId]: '' },
            messages: messages.map((m) =>
              m.id === turnId && m.role === 'agent'
                ? {
                    ...m,
                    blocks: [
                      ...m.blocks,
                      { type: 'openui', id: action.blockId, content: '' } satisfies OpenUIBlock,
                    ],
                  }
                : m
            ),
          }
        }

        case 'BLOCK_DELTA': {
          if (!state.currentTurnId) return {}
          const accumulated = (state.streamingBlocks[action.blockId] ?? '') + action.delta
          const turnId = state.currentTurnId
          return {
            streamingBlocks: { ...state.streamingBlocks, [action.blockId]: accumulated },
            messages: state.messages.map((m) =>
              m.id === turnId && m.role === 'agent'
                ? {
                    ...m,
                    blocks: m.blocks.map((b) =>
                      b.type === 'openui' && b.id === action.blockId
                        ? { ...b, content: accumulated }
                        : b
                    ),
                  }
                : m
            ),
          }
        }

        case 'BLOCK_CLOSED': {
          const { [action.blockId]: _dropped, ...restBlocks } = state.streamingBlocks
          return { streamingBlocks: restBlocks }
        }

        case 'RESUMING': {
          return {
            messages: [...state.messages.filter((m) => m.role !== 'typing'), { role: 'typing', id: 'typing' }],
            isStreaming: true,
            pendingHITL: false,
          }
        }

        case 'INTERRUPTED': {
          const { conflict_id, conflict_type, detail, documents, recommendation, recommended_document_id } = action.hitl
          const hitlMsg: HITLMessage = {
            role: 'hitl',
            id: 'hitl-' + conflict_id,
            ts: nowTs(),
            conflictType: conflict_type,
            title: CONFLICT_LABELS[conflict_type] ?? conflict_type,
            explanation: detail,
            sources: documents.map((d) => ({ id: d.id, name: d.title, date: d.created_at, stance: d.stance })),
            recommend: recommendation,
            recommendedId: recommended_document_id ?? undefined,
          }
          return {
            messages: [...state.messages.filter((m) => m.role !== 'typing'), hitlMsg],
            pendingHITL: true,
          }
        }

        case 'RUN_FINISHED': {
          return {
            messages: state.messages.filter((m) => m.role !== 'typing'),
            currentTurnId: null,
            streamingBlocks: {},
            streamingArgs: {},
            isStreaming: false,
          }
        }

        case 'RUN_ERROR': {
          const errBlock: ErrorBlock = {
            type: 'error',
            id: 'err-block-' + Date.now(),
            message: action.message || 'Something went wrong. Try again.',
          }
          const errMsg: AgentMessage = {
            role: 'agent',
            id: 'err-' + Date.now(),
            ts: nowTs(),
            blocks: [errBlock],
            sources: [],
          }
          return {
            messages: [...state.messages.filter((m) => m.role !== 'typing'), errMsg],
            currentTurnId: null,
            streamingBlocks: {},
            streamingArgs: {},
            isStreaming: false,
          }
        }

        default:
          return {}
      }
    }),

  clearMessages: async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id ?? 'anon'
    set({ messages: [], threadId: `${userId}-${Date.now()}`, pendingHITL: false })
  },

  setThreadId: (id) => set({ threadId: id }),
  setIsStreaming: (value) => set({ isStreaming: value }),
  setPendingHITL: (value) => set({ pendingHITL: value }),
}))
