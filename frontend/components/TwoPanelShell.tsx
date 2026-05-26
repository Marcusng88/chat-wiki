'use client'

import { useAppStore } from '@/store/useAppStore'
import LeftPanel from './LeftPanel'
import ChatPanel from './ChatPanel'

export default function TwoPanelShell() {
  const { isMobileDrawerOpen, setIsMobileDrawerOpen } = useAppStore()

  return (
    <div className="flex h-full overflow-hidden">
      <aside data-testid="left-panel" className="hidden md:flex w-[280px] shrink-0 flex-col border-r" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <LeftPanel />
      </aside>

      {isMobileDrawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            aria-label="Close drawer"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col md:hidden" style={{ background: 'var(--surface)' }}>
            <LeftPanel />
          </aside>
        </>
      )}

      <main data-testid="main-panel" className="flex flex-1 flex-col overflow-hidden">
        <ChatPanel />
      </main>
    </div>
  )
}
