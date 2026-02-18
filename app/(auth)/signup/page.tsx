'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()

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
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
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
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
    if (error) setError('OAuth sign-up failed. Please try again.')
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#C2F2E4]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#35C8B4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#0F1720]">Check your email</h2>
          <p className="mt-2 text-sm text-[#5B6B73]">
            We sent a confirmation link to <span className="font-medium text-[#0F1720]">{email}</span>.
            Click it to activate your account.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm font-medium text-[#35C8B4] hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">

        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#0F1720] tracking-tight">PinDev</h1>
          <p className="mt-1 text-sm text-[#5B6B73]">Create an account to share your projects</p>
        </div>

        {/* OAuth */}
        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={() => handleOAuth('github')}
            className="flex items-center justify-center gap-3 w-full rounded-2xl border border-[#E6ECEA] bg-white px-4 py-3 text-sm font-medium text-[#0F1720] hover:bg-[#EDF7BE] transition-colors"
          >
            <GitHubIcon />
            Continue with GitHub
          </button>
          <button
            onClick={() => handleOAuth('google')}
            className="flex items-center justify-center gap-3 w-full rounded-2xl border border-[#E6ECEA] bg-white px-4 py-3 text-sm font-medium text-[#0F1720] hover:bg-[#EDF7BE] transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-[#E6ECEA]" />
          <span className="text-xs text-[#5B6B73]">or</span>
          <div className="flex-1 h-px bg-[#E6ECEA]" />
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-xs font-medium text-[#5B6B73] uppercase tracking-wide">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-2xl border border-[#E6ECEA] bg-white px-4 py-3 text-sm text-[#0F1720] placeholder:text-[#5B6B73] outline-none focus:border-[#35C8B4] focus:ring-2 focus:ring-[#35C8B4]/20 transition"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-medium text-[#5B6B73] uppercase tracking-wide">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="rounded-2xl border border-[#E6ECEA] bg-white px-4 py-3 text-sm text-[#0F1720] placeholder:text-[#5B6B73] outline-none focus:border-[#35C8B4] focus:ring-2 focus:ring-[#35C8B4]/20 transition"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="confirm" className="text-xs font-medium text-[#5B6B73] uppercase tracking-wide">
              Confirm Password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="rounded-2xl border border-[#E6ECEA] bg-white px-4 py-3 text-sm text-[#0F1720] placeholder:text-[#5B6B73] outline-none focus:border-[#35C8B4] focus:ring-2 focus:ring-[#35C8B4]/20 transition"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#35C8B4] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2db5a3] disabled:opacity-60 transition-colors"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#5B6B73]">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[#35C8B4] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}