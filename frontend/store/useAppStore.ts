'use client'

import { create } from 'zustand'
import type { Document, Message } from '@/lib/types'

interface AppState {
  documents: Document[]
  messages: Message[]
  threadId: string | null
  leftCollapsed: boolean
  leftPanelView: 'list' | 'detail'
  selectedDocId: string | null
  isStreaming: boolean
  isMobileDrawerOpen: boolean
}

interface AppActions {
  setDocuments: (docs: Document[] | ((prev: Document[]) => Document[])) => void
  addMessage: (msg: Message) => void
  updateMessage: (id: string, patch: Partial<Message>) => void
  clearMessages: (newThreadId: string) => void
  setThreadId: (id: string | null) => void
  setLeftCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void
  setLeftPanelView: (view: 'list' | 'detail') => void
  setSelectedDocId: (id: string | null) => void
  setIsStreaming: (value: boolean) => void
  setMobileDrawerOpen: (value: boolean) => void
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
}

export const useAppStore = create<AppState & AppActions>()((set) => ({
  ...initialState,

  setDocuments: (docs) =>
    set((s) => ({ documents: typeof docs === 'function' ? docs(s.documents) : docs })),

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  updateMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } as Message : m)),
    })),

  clearMessages: (newThreadId) =>
    set({ messages: [], threadId: newThreadId }),

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

  openDocument: (id) =>
    set({ leftPanelView: 'detail', selectedDocId: id, isMobileDrawerOpen: false }),

  backToList: () =>
    set({ leftPanelView: 'list', selectedDocId: null }),
}))

export const useActiveConflicts = () =>
  useAppStore((s) => s.documents.filter((d) => d.hasConflict))
