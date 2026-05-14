'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })

    if (error) {
      setError(error.message ?? 'Sign-up failed. Please try again.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  async function handleOAuth(provider: 'github' | 'google') {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) setError('OAuth sign-up failed. Please try again.')
  }

  /* ── Email-confirmed success screen ── */
  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: '0 16px' }}>
        <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#C2F2E4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 4px 20px rgb(53 200 180 / .25)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#35C8B4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Check your email
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.65, margin: '0 0 28px' }}>
            We sent a confirmation link to{' '}
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{email}</span>.
            {' '}Click it to activate your account.
          </p>
          <Link href="/login" className="back-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        @media (max-width: 768px) {
          .signup-left-panel { display: none !important; }
          .signup-right-panel { padding: 32px 24px !important; }
        }
      `}</style>

      {/* ── LEFT PANEL ── */}
      <div className="signup-left-panel" style={{
        flex: '0 0 52%',
        background: 'linear-gradient(150deg, #eafaf6 0%, #C2F2E4 55%, #aeeada 100%)',
        display: 'flex',
        flexDirection: 'column',
        padding: '44px 52px',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--menthe)',
            boxShadow: '0 2px 8px rgb(53 200 180 / .35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.04em', lineHeight: 1 }}>P</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: '0.875rem', letterSpacing: '0.14em', color: 'var(--text)' }}>
            PINDEV
          </span>
        </div>

        {/* Headline */}
        <div style={{ marginTop: 72, maxWidth: 400 }}>
          <h1 style={{
            fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
            fontWeight: 800,
            lineHeight: 1.08,
            color: 'var(--text)',
            letterSpacing: '-0.03em',
            margin: 0,
          }}>
            Start{' '}
            <span style={{ color: 'var(--menthe)' }}>sharing</span>
            <br />
            your best
            <br />
            <em style={{ fontStyle: 'italic', color: 'var(--menthe)' }}>creations.</em>
          </h1>
        </div>

        {/* Floating deploy card */}
        <div style={{
          position: 'absolute',
          right: 56,
          top: '40%',
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 12px 40px rgb(0 0 0 / .13)',
          padding: '16px 20px',
          width: 220,
          transform: 'rotate(2deg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#27c93f', flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', color: '#5B6B73', textTransform: 'uppercase' }}>
              Deploying...
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: '#E6ECEA', overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ height: '100%', width: '65%', borderRadius: 4, background: 'var(--menthe)' }} />
          </div>
          <p style={{ fontSize: '0.65rem', color: '#5B6B73', margin: 0 }}>pindev-app on Vercel</p>
        </div>

        {/* Floating tag card */}
        <div style={{
          position: 'absolute',
          left: 52,
          bottom: 64,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 6px 24px rgb(0 0 0 / .10)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          transform: 'rotate(-1.5deg)',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--limonade)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8ab83a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"/>
              <polyline points="8 6 2 12 8 18"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', margin: '0 0 2px', textTransform: 'uppercase' }}>
              Just shipped
            </p>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              AI Dashboard v2
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="signup-right-panel" style={{
        flex: 1,
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
      }}>
        <div style={{ width: '100%', maxWidth: 388 }}>

          <h2 style={{
            fontSize: '1.875rem',
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.03em',
            margin: '0 0 8px',
          }}>
            Join PinDev
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', margin: '0 0 32px', lineHeight: 1.55 }}>
            Create an account to start sharing your projects.
          </p>

          {/* GitHub */}
          <OAuthButton
            onClick={() => handleOAuth('github')}
            dark
            icon={<GitHubIcon />}
            label="Continue with GitHub"
          />

          {/* Google */}
          <OAuthButton
            onClick={() => handleOAuth('google')}
            icon={<GoogleIcon />}
            label="Continue with Google"
            style={{ marginTop: 10 }}
          />

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em' }}>
              OR JOIN WITH EMAIL
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {!showEmailForm ? (
            <OAuthButton
              onClick={() => setShowEmailForm(true)}
              icon={<EmailIcon />}
              label="Create account with Email"
              muted
            />
          ) : (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="field-input"
                style={{ height: 52, borderRadius: 14, fontSize: '0.9rem' }}
              />
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password (min. 8 characters)"
                className="field-input"
                style={{ height: 52, borderRadius: 14, fontSize: '0.9rem' }}
              />
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm password"
                className="field-input"
                style={{ height: 52, borderRadius: 14, fontSize: '0.9rem' }}
              />
              {error && (
                <div style={{
                  borderRadius: 12, border: '1px solid #fecaca',
                  background: '#fef2f2', padding: '10px 14px',
                  fontSize: '0.8125rem', color: '#dc2626',
                }}>
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  height: 52, borderRadius: 14, border: 'none',
                  background: 'var(--menthe)', color: '#fff',
                  fontSize: '0.9375rem', fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.65 : 1,
                  transition: 'background 150ms',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'var(--menthe-dark)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--menthe)' }}
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
              <button type="button" onClick={() => setShowEmailForm(false)} className="back-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Back to options
              </button>
            </form>
          )}

          <p style={{
            marginTop: 28,
            fontSize: '0.875rem',
            color: 'var(--muted)',
            textAlign: 'center',
          }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--menthe)', fontWeight: 700, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>

          <p style={{
            marginTop: 20,
            fontSize: '0.72rem',
            color: 'var(--muted)',
            textAlign: 'center',
            lineHeight: 1.7,
          }}>
            By creating an account, you agree to Pindev&rsquo;s{' '}
            <a href="#" style={{ color: 'var(--menthe)', textDecoration: 'none', fontWeight: 500 }}>Terms</a>
            {' '}and{' '}
            <a href="#" style={{ color: 'var(--menthe)', textDecoration: 'none', fontWeight: 500 }}>Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   REUSABLE OAUTH BUTTON
   ───────────────────────────────────────────────────────────── */
function OAuthButton({
  onClick, icon, label, dark, muted, style: extraStyle,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  dark?: boolean
  muted?: boolean
  style?: React.CSSProperties
}) {
  const [hovered, setHovered] = useState(false)

  const base: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    width: '100%', height: 52,
    borderRadius: 14,
    fontSize: '0.9375rem', fontWeight: 600,
    cursor: 'pointer',
    border: dark ? 'none' : '1.5px solid var(--border)',
    transition: 'all 150ms',
    letterSpacing: '-0.01em',
    ...extraStyle,
  }

  const darkStyle: React.CSSProperties = {
    background: hovered ? '#1a1a1a' : 'var(--text)',
    color: '#fff',
  }

  const lightStyle: React.CSSProperties = {
    background: hovered ? 'var(--surface-2)' : muted ? 'var(--surface)' : '#fff',
    color: 'var(--text)',
    borderColor: hovered ? 'var(--menthe)' : 'var(--border)',
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...base, ...(dark ? darkStyle : lightStyle) }}
    >
      {icon}
      {label}
    </button>
  )
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}
