import { create } from 'zustand'

export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'conflict'

export interface Document {
  id: string
  name: string
  status: DocumentStatus
  rawContent?: string
  createdAt?: string
}

export interface Message {
  id: string
  type: 'user' | 'agent' | 'typing' | 'hitl' | 'a2ui'
  content?: string
  hasSources?: boolean
  sources?: { documentId: string; fileName: string }[]
}

interface AppState {
  documents: Document[]
  messages: Message[]
  activeConflicts: string[]
  threadId: string | null
  leftPanelView: 'list' | 'detail'
  selectedDocumentId: string | null
  isStreaming: boolean
  isMobileDrawerOpen: boolean
}

interface AppActions {
  setDocuments: (docs: Document[]) => void
  addMessage: (msg: Message) => void
  updateMessage: (id: string, patch: Partial<Message>) => void
  clearMessages: (newThreadId: string) => void
  setActiveConflicts: (ids: string[]) => void
  setThreadId: (id: string | null) => void
  setLeftPanelView: (view: 'list' | 'detail') => void
  setSelectedDocumentId: (id: string | null) => void
  setIsStreaming: (value: boolean) => void
  setIsMobileDrawerOpen: (value: boolean) => void
}

const initialState: AppState = {
  documents: [],
  messages: [],
  activeConflicts: [],
  threadId: null,
  leftPanelView: 'list',
  selectedDocumentId: null,
  isStreaming: false,
  isMobileDrawerOpen: false,
}

export const useAppStore = create<AppState & AppActions>()((set) => ({
  ...initialState,

  setDocuments: (docs) => set({ documents: docs }),

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  updateMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),

  clearMessages: (newThreadId) =>
    set({ messages: [], threadId: newThreadId }),

  setActiveConflicts: (ids) => set({ activeConflicts: ids }),

  setThreadId: (id) => set({ threadId: id }),

  setLeftPanelView: (view) =>
    set((s) => ({
      leftPanelView: view,
      selectedDocumentId: view === 'list' ? null : s.selectedDocumentId,
    })),

  setSelectedDocumentId: (id) => set({ selectedDocumentId: id }),

  setIsStreaming: (value) => set({ isStreaming: value }),

  setIsMobileDrawerOpen: (value) => set({ isMobileDrawerOpen: value }),
}))
