'use client'

import { create } from 'zustand'

interface UIState {
  leftCollapsed: boolean
  isMobileDrawerOpen: boolean
}

interface UIActions {
  setLeftCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void
  setMobileDrawerOpen: (value: boolean) => void
}

export const useUIStore = create<UIState & UIActions>()((set) => ({
  leftCollapsed: false,
  isMobileDrawerOpen: false,

  setLeftCollapsed: (value) =>
    set((s) => ({ leftCollapsed: typeof value === 'function' ? value(s.leftCollapsed) : value })),

  setMobileDrawerOpen: (value) => set({ isMobileDrawerOpen: value }),
}))
