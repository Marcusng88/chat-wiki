'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'
import { createClient } from '@/lib/supabase'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) {
      setError("Email or password doesn't look right. Try again.")
      return
    }
    router.push('/')
  }

  async function handleGoogle() {
    setLoading(true)
    const supabase = createClient()
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : '/'
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    setLoading(false)
  }

  return (
    <div className="signin-wrap">
      {/* top bar */}
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

      {/* centered card */}
      <div className="signin-center">
        <div className="signin-card">
          {/* header */}
          <div className="signin-head">
            <div className="signin-eyebrow">
              <span className="line" />
              welcome back
            </div>
            <div className="signin-title">Sign in to your library.</div>
            <div className="signin-subtitle">
              Pick up where you left off — your sources, summaries, and conversations are right where you left them.
            </div>
          </div>

          {/* form */}
          <form className="signin-form" onSubmit={handleSubmit} aria-label="Sign in form">
            {error && (
              <div className="signin-err" role="alert">{error}</div>
            )}

            {/* email */}
            <div className="field">
              <label htmlFor="email">Email</label>
              <div className="input-wrap">
                <svg
                  className="icn"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
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

            {/* password */}
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <svg
                  className="icn"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  minLength={6}
                />
                <button
                  type="button"
                  className="pwd-toggle"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPwd((v) => !v)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPwd ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </>
                    ) : (
                      <>
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>

              <div className="field-meta">
                <label className="check-row">
                  <input type="checkbox" defaultChecked />
                  Keep me signed in
                </label>
                <a className="forgot-link" href="#">Forgot password?</a>
              </div>
            </div>

            {/* submit */}
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  Signing you in…
                </>
              ) : (
                <>
                  Sign in
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>

            <div className="signin-sep">or</div>

            <button type="button" className="sso-btn" onClick={handleGoogle} disabled={loading}>
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
                <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>
          </form>

          <div className="signin-foot">
            New here? <a href="#">Create an account</a>
          </div>
        </div>
      </div>

      <div className="legal">© Chat Wiki · your library, encrypted at rest</div>
    </div>
  )
}
