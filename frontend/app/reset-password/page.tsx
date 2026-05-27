'use client'

import { useState } from 'react'
import ThemeToggle from '@/components/ThemeToggle'
import { createClient } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const origin = window.location.origin
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/update-password`,
    })
    setLoading(false)
    if (authError) {
      setError('Could not send reset email. Try again.')
      return
    }
    setSubmitted(true)
  }

  return (
    <div className="signin-wrap">
      <div className="signin-topbar">
        <div className="brand-block">
          <div className="brand">
            <span className="dot" />
            <span className="name">
              CHAT<em>·</em>WIKI
            </span>
          </div>
          <div className="tag">your sources, synthesized.</div>
        </div>
        <div className="spacer" />
        <ThemeToggle />
      </div>

      <div className="signin-center">
        <div className="signin-card">
          <div className="signin-head">
            <div className="signin-eyebrow">
              <span className="line" />
              account recovery
            </div>
            <div className="signin-title">Reset your password.</div>
            <div className="signin-subtitle">
              {submitted
                ? 'Check your email — a reset link is on its way.'
                : 'Enter your email and we\'ll send you a reset link.'}
            </div>
          </div>

          {!submitted && (
            <form className="signin-form" onSubmit={handleSubmit} aria-label="Reset password form">
              {error && (
                <div className="signin-err" role="alert">{error}</div>
              )}

              <div className="field">
                <label htmlFor="email">Email</label>
                <div className="input-wrap">
                  <svg className="icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" />
                    Sending…
                  </>
                ) : (
                  <>
                    Send reset link
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="signin-foot">
            <a href="/sign-in">Back to sign in</a>
          </div>
        </div>
      </div>

      <div className="legal">© Chat Wiki · your library, encrypted at rest</div>
    </div>
  )
}
