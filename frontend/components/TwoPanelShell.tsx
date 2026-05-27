'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { useConfirm } from '@/lib/hooks/useConfirm'
import { createClient } from '@/lib/supabase'
import LeftPanel from './LeftPanel'
import ChatPanel from './ChatPanel'
import ThemeToggle from './ThemeToggle'
import ConfirmDialog from './ConfirmDialog'
import { Menu, Eye, LogOut } from './Icons'

// ── Resizer ──────────────────────────────────────────────────────────────────

function Resizer() {
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const saved = parseInt(localStorage.getItem('cw:left-w') || '', 10)
    if (!isNaN(saved)) document.documentElement.style.setProperty('--left-w', saved + 'px')
  }, [])

  function onDown(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    setDragging(true)
    document.body.classList.add('resizing')
    const shellInner = document.querySelector('.shell-inner') as HTMLElement
    if (!shellInner) return
    const rect = shellInner.getBoundingClientRect()

    function move(ev: MouseEvent | TouchEvent) {
      const clientX =
        'clientX' in ev ? ev.clientX : (ev as TouchEvent).touches[0]?.clientX ?? 0
      const x = clientX - rect.left
      const min = 280
      const max = Math.max(min + 1, rect.width - 320 - 8)
      const w = Math.min(max, Math.max(min, x))
      document.documentElement.style.setProperty('--left-w', w + 'px')
    }
    function up() {
      setDragging(false)
      document.body.classList.remove('resizing')
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
      const w = getComputedStyle(document.documentElement).getPropertyValue('--left-w').trim()
      const px = parseInt(w, 10)
      if (!isNaN(px)) localStorage.setItem('cw:left-w', String(px))
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', up)
  }

  function onDoubleClick() {
    document.documentElement.style.setProperty('--left-w', '520px')
    localStorage.setItem('cw:left-w', '520')
  }

  return (
    <div
      className={`resizer${dragging ? ' dragging' : ''}`}
      onMouseDown={onDown}
      onTouchStart={onDown}
      onDoubleClick={onDoubleClick}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sources panel — double-click to reset"
      title="Drag to resize · double-click to reset"
    />
  )
}

// ── AppHeader ─────────────────────────────────────────────────────────────────

function AppHeader() {
  const { setMobileDrawerOpen, setThreadId } = useAppStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const requestConfirm = useConfirm()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
      if (data.user?.id) setThreadId(`${data.user.id}-${Date.now()}`)
    })
  }, [setThreadId])

  useEffect(() => {
    if (!menuOpen) return
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const handleSignOut = useCallback(async () => {
    setMenuOpen(false)
    const ok = await requestConfirm({
      title: 'Sign out?',
      message: `You'll need to sign back in to see your library. Your files and chats stay safe.`,
      confirmText: 'Sign out',
      cancelText: 'Stay',
    })
    if (!ok) return
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
  }, [requestConfirm, router])

  return (
    <header className="app-header">
      <button
        className="icon-btn hamburger"
        onClick={() => setMobileDrawerOpen(true)}
        aria-label="Open sources"
      >
        <Menu />
      </button>

      <div className="brand-block">
        <div className="brand">
          <span className="dot" />
          <span className="name">
            CHAT<em>·</em>WIKI
          </span>
        </div>
        <div className="tagline">ask anything — answers come from the files you&apos;ve added.</div>
      </div>

      <div className="spacer" />

      <div className="header-actions">
        <ThemeToggle />

        <div className="account-wrap" ref={menuRef}>
          <button
            className={`account-btn${menuOpen ? ' open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account"
            title="Account"
          >
            <span className="avatar">{userEmail ? userEmail.slice(0, 2).toUpperCase() : '??'}</span>
          </button>

          {menuOpen && (
            <div className="account-menu" onClick={(e) => e.stopPropagation()}>
              <div className="account-info">
                <div className="account-name">{userEmail?.split('@')[0] ?? 'You'}</div>
                <div className="account-email">{userEmail ?? ''}</div>
              </div>
              <div className="row-menu-sep" />
              <button className="account-item">
                <Eye />
                <span>Account settings</span>
              </button>
              <button
                className="account-item danger"
                onClick={handleSignOut}
              >
                <LogOut />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// ── TwoPanelShell ─────────────────────────────────────────────────────────────

export default function TwoPanelShell() {
  const { isMobileDrawerOpen, setMobileDrawerOpen, leftCollapsed, setLeftCollapsed } =
    useAppStore()

  // Restore collapse state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cw:left-collapsed')
      if (saved === '1') setLeftCollapsed(true)
    } catch {}
  }, [setLeftCollapsed])

  // Persist collapse state
  useEffect(() => {
    try {
      localStorage.setItem('cw:left-collapsed', leftCollapsed ? '1' : '0')
    } catch {}
  }, [leftCollapsed])

  return (
    <>
      <AppHeader />

      <div className="shell">
        <div className={`shell-inner${leftCollapsed ? ' left-collapsed' : ''}`}>
          <aside
            data-testid="left-panel"
            className={`panel left-panel${isMobileDrawerOpen ? ' open' : ''}${leftCollapsed ? ' collapsed' : ''}`}
          >
            <LeftPanel />
          </aside>

          <Resizer />

          <main
            data-testid="main-panel"
            className="panel chat-panel"
          >
            <ChatPanel />
          </main>
        </div>
      </div>

      {isMobileDrawerOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      <ConfirmDialog />
    </>
  )
}
