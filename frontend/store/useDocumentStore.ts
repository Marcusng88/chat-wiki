'use client'

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import type { Document } from '@/lib/types'

interface DocumentState {
  documents: Document[]
  selectedDocId: string | null
  leftPanelView: 'list' | 'detail'
}

interface DocumentActions {
  setDocuments: (docs: Document[] | ((prev: Document[]) => Document[])) => void
  setSelectedDocId: (id: string | null) => void
  setLeftPanelView: (view: 'list' | 'detail') => void
  openDocument: (id: string) => void
  backToList: () => void
}

const initialState: DocumentState = {
  documents: [],
  selectedDocId: null,
  leftPanelView: 'list',
}

export const useDocumentStore = create<DocumentState & DocumentActions>()((set) => ({
  ...initialState,

  setDocuments: (docs) =>
    set((s) => ({ documents: typeof docs === 'function' ? docs(s.documents) : docs })),

  setSelectedDocId: (id) => set({ selectedDocId: id }),

  setLeftPanelView: (view) =>
    set((s) => ({
      leftPanelView: view,
      selectedDocId: view === 'list' ? null : s.selectedDocId,
    })),

  openDocument: (id) => set({ leftPanelView: 'detail', selectedDocId: id }),

  backToList: () => set({ leftPanelView: 'list', selectedDocId: null }),
}))

export const useActiveConflicts = () =>
  useDocumentStore(useShallow((s) => s.documents.filter((d) => d.hasConflict)))
