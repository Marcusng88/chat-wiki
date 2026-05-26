'use client'

import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import LeftPanel from './LeftPanel'
import ChatPanel from './ChatPanel'
import ThemeToggle from './ThemeToggle'

function AppHeader() {
  const { setMobileDrawerOpen: setIsMobileDrawerOpen } = useAppStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    setTimeout(() => document.addEventListener('mousedown', close), 0)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--header-h)',
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--panel-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        zIndex: 50,
        gap: 12,
      }}
    >
      {/* hamburger (mobile) */}
      <button
        aria-label="Open menu"
        onClick={() => setIsMobileDrawerOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 4,
          borderRadius: 6,
        }}
        className="md:hidden"
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* brand */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 15,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--text-primary)',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              background: 'var(--accent)',
              borderRadius: 2,
              boxShadow: '0 0 10px var(--accent)',
              flexShrink: 0,
            }}
          />
          CHAT<span style={{ color: 'var(--accent)' }}>·</span>WIKI
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
            paddingLeft: 15,
            opacity: 0.8,
          }}
        >
          ask anything — answers come from the files you&apos;ve added.
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* header actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ThemeToggle />

        {/* account menu */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account"
            title="Account"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent-ring)',
              color: 'var(--accent)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '0.02em',
            }}
          >
            YK
          </button>

          {menuOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                right: 0,
                top: 40,
                minWidth: 180,
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border-strong)',
                borderRadius: 10,
                boxShadow: 'var(--panel-shadow)',
                overflow: 'hidden',
                zIndex: 100,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: '10px 12px 8px',
                  borderBottom: '1px solid var(--panel-border)',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>You</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>you@example.com</div>
              </div>
              <button
                role="menuitem"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-soft)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                Account settings
              </button>
              <button
                role="menuitem"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--status-failed)',
                  fontSize: 11,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-soft)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                onClick={() => setMenuOpen(false)}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default function TwoPanelShell() {
  const { isMobileDrawerOpen, setMobileDrawerOpen: setIsMobileDrawerOpen } = useAppStore()

  return (
    <div className="flex h-full overflow-hidden" style={{ flexDirection: 'column' }}>
      <AppHeader />

      {/* content below fixed header */}
      <div
        className="flex overflow-hidden"
        style={{ flex: 1, marginTop: 'var(--header-h)' }}
      >
        <aside
          data-testid="left-panel"
          className="hidden md:flex shrink-0 flex-col"
          style={{
            width: 280,
            borderRight: '1px solid var(--panel-border)',
            background: 'var(--panel-bg)',
          }}
        >
          <LeftPanel />
        </aside>

        {isMobileDrawerOpen && (
          <>
            <div
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              aria-label="Close drawer"
              onClick={() => setIsMobileDrawerOpen(false)}
            />
            <aside
              className="fixed inset-y-0 left-0 z-50 flex flex-col md:hidden"
              style={{ width: 280, background: 'var(--panel-bg)', top: 'var(--header-h)' }}
            >
              <LeftPanel />
            </aside>
          </>
        )}

        <main
          data-testid="main-panel"
          className="flex flex-1 flex-col overflow-hidden"
          style={{ background: 'var(--page-bg)' }}
        >
          <ChatPanel />
        </main>
      </div>
    </div>
  )
}
