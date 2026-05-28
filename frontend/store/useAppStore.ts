'use client'

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { createClient } from '@/lib/supabase'
import type { Block, Document, Message, TextBlock, ToolCallStep } from '@/lib/types'

interface AppState {
  documents: Document[]
  messages: Message[]
  threadId: string | null
  leftCollapsed: boolean
  leftPanelView: 'list' | 'detail'
  selectedDocId: string | null
  isStreaming: boolean
  isMobileDrawerOpen: boolean
  pendingHITL: boolean
}

interface AppActions {
  setDocuments: (docs: Document[] | ((prev: Document[]) => Document[])) => void
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void
  addMessage: (msg: Message) => void
  updateMessage: (id: string, patch: Partial<Message>) => void
  addBlock: (msgId: string, block: Block) => void
  updateTextBlock: (msgId: string, blockId: string, md: string) => void
  addToolCallStep: (msgId: string, step: ToolCallStep) => void
  updateToolCallStep: (msgId: string, stepId: string, patch: Partial<ToolCallStep>) => void
  clearMessages: () => Promise<void>
  setThreadId: (id: string | null) => void
  setLeftCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void
  setLeftPanelView: (view: 'list' | 'detail') => void
  setSelectedDocId: (id: string | null) => void
  setIsStreaming: (value: boolean) => void
  setMobileDrawerOpen: (value: boolean) => void
  setPendingHITL: (value: boolean) => void
  openDocument: (id: string) => void
  backToList: () => void
}

const initialState: AppState = {
  documents: [],
  messages: [],
  threadId: null,
  leftCollapsed: false,
  leftPanelView: 'list',
  selectedDocId: null,
  isStreaming: false,
  isMobileDrawerOpen: false,
  pendingHITL: false,
}

export const useAppStore = create<AppState & AppActions>()((set) => ({
  ...initialState,

  setDocuments: (docs) =>
    set((s) => ({ documents: typeof docs === 'function' ? docs(s.documents) : docs })),

  setMessages: (msgs) =>
    set((s) => ({ messages: typeof msgs === 'function' ? msgs(s.messages) : msgs })),

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  updateMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } as Message : m)),
    })),

  addBlock: (msgId, block) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === msgId && m.role === 'agent'
          ? { ...m, blocks: [...m.blocks, block] } as Message
          : m
      ),
    })),

  updateTextBlock: (msgId, blockId, md) =>
    set((s) => ({
      messages: s.messages.map((m) => {
        if (m.id !== msgId || m.role !== 'agent') return m
        return {
          ...m,
          blocks: m.blocks.map((b) =>
            b.type === 'text' && b.id === blockId ? { ...b, md } as TextBlock : b
          ),
        } as Message
      }),
    })),

  addToolCallStep: (msgId, step) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === msgId && m.role === 'agent'
          ? { ...m, steps: [...(m.steps ?? []), step] } as Message
          : m
      ),
    })),

  updateToolCallStep: (msgId, stepId, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => {
        if (m.id !== msgId || m.role !== 'agent') return m
        return {
          ...m,
          steps: (m.steps ?? []).map((s) =>
            s.id === stepId ? { ...s, ...patch } : s
          ),
        } as Message
      }),
    })),

  clearMessages: async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id ?? 'anon'
    set({ messages: [], threadId: `${userId}-${Date.now()}` })
  },

  setThreadId: (id) => set({ threadId: id }),

  setLeftCollapsed: (value) =>
    set((s) => ({ leftCollapsed: typeof value === 'function' ? value(s.leftCollapsed) : value })),

  setLeftPanelView: (view) =>
    set((s) => ({
      leftPanelView: view,
      selectedDocId: view === 'list' ? null : s.selectedDocId,
    })),

  setSelectedDocId: (id) => set({ selectedDocId: id }),

  setIsStreaming: (value) => set({ isStreaming: value }),

  setMobileDrawerOpen: (value) => set({ isMobileDrawerOpen: value }),

  setPendingHITL: (value) => set({ pendingHITL: value }),

  openDocument: (id) =>
    set({ leftPanelView: 'detail', selectedDocId: id, isMobileDrawerOpen: false }),

  backToList: () =>
    set({ leftPanelView: 'list', selectedDocId: null }),
}))

export const useActiveConflicts = () =>
  useAppStore(useShallow((s) => s.documents.filter((d) => d.hasConflict)))
