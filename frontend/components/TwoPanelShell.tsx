'use client'

import { useAppStore } from '@/store/useAppStore'
import LeftPanel from './LeftPanel'

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
        <header className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <button
            aria-label="Open menu"
            className="md:hidden"
            onClick={() => setIsMobileDrawerOpen(true)}
            style={{ color: 'var(--fg)' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect y="3" width="20" height="2" rx="1" />
              <rect y="9" width="20" height="2" rx="1" />
              <rect y="15" width="20" height="2" rx="1" />
            </svg>
          </button>
          <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>Chat Wiki</span>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          <p style={{ color: 'var(--fg-muted)' }}>Main Panel</p>
        </div>
      </main>
    </div>
  )
}
