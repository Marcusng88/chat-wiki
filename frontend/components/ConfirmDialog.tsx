'use client'
import { useEffect, useRef, useState } from 'react'
import { _registerConfirm, _unregisterConfirm, type ConfirmOptions } from '@/lib/hooks/useConfirm'
import { Trash, Check, Sparkle } from './Icons'

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve: (result: boolean) => void
}

export default function ConfirmDialog() {
  const [state, setState] = useState<ConfirmState | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    _registerConfirm((opts) =>
      new Promise<boolean>((resolve) => {
        const close = (result: boolean) => {
          setState(null)
          resolve(result)
        }
        setState({ ...opts, open: true, resolve: close })
      })
    )
    return () => _unregisterConfirm()
  }, [])

  useEffect(() => {
    if (!state?.open) return
    cancelRef.current?.focus()
    const resolve = state.resolve
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') resolve(false)
      if (e.key === 'Enter') resolve(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state])

  if (!state?.open) return null

  return (
    <div
      className="confirm-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) state.resolve(false) }}
    >
      <div
        className={`confirm-card${state.danger ? ' danger' : ''}`}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="confirm-head">
          <span className={`confirm-icon${state.danger ? ' danger' : ''}`}>
            {state.danger ? <Trash /> : <Sparkle />}
          </span>
          <div className="confirm-titles">
            <div className="confirm-title">{state.title}</div>
            <div className="confirm-message">{state.message}</div>
          </div>
        </div>
        <div className="confirm-actions">
          <button ref={cancelRef} className="hitl-btn" onClick={() => state.resolve(false)}>
            {state.cancelText ?? 'Cancel'}
          </button>
          <button
            className={`hitl-btn${state.danger ? ' danger' : ' primary'}`}
            onClick={() => state.resolve(true)}
          >
            {state.danger ? <Trash /> : <Check />}
            {state.confirmText ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
