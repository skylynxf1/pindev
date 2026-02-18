'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'

type FormState = {
  username: string
  display_name: string
  bio: string
}

type FieldErrors = Partial<Record<keyof FormState, string>>

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold text-[#5B6B73] uppercase tracking-wide mb-1"
    >
      {children}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-500">{message}</p>
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-[#5B6B73]">{children}</p>
}

export default function SettingsProfilePage() {
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState<FormState>({
    username: '',
    display_name: '',
    bio: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // ── Load current profile ──────────────────────────────────────────────────
  useEffect(() => {
    async function fetchProfile() {
      const res = await fetch('/api/profile')

      if (res.status === 401) {
        router.push('/login?next=/settings/profile')
        return
      }

      if (!res.ok) {
        setSubmitError('Could not load your profile. Please refresh.')
        setLoading(false)
        return
      }

      const json = await res.json()
      const p: Profile = json.profile

      setProfile(p)
      setForm({
        username: p.username,
        display_name: p.display_name ?? '',
        bio: p.bio ?? '',
      })
      setLoading(false)
    }

    fetchProfile()
  }, [router])

  // ── Client-side field validation ──────────────────────────────────────────
  function validateForm(): FieldErrors {
    const errors: FieldErrors = {}

    const username = form.username.trim()
    if (!username) {
      errors.username = 'Username is required.'
    } else if (username.length < 2) {
      errors.username = 'Username must be at least 2 characters.'
    } else if (username.length > 30) {
      errors.username = 'Username must be 30 characters or fewer.'
    } else if (!/^[a-z0-9_]+$/.test(username)) {
      errors.username =
        'Only lowercase letters, numbers, and underscores are allowed.'
    }

    if (form.display_name.length > 60) {
      errors.display_name = 'Display name must be 60 characters or fewer.'
    }

    if (form.bio.length > 300) {
      errors.bio = 'Bio must be 300 characters or fewer.'
    }

    return errors
  }

  function setField<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Clear error for this field on change
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
    setSuccessMessage(null)
    setSubmitError(null)
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSuccessMessage(null)

    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.username.trim(),
        display_name: form.display_name.trim(),
        bio: form.bio.trim(),
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      // Surface field-specific errors from the server where possible
      const msg: string = json.error ?? 'Something went wrong.'
      if (msg.toLowerCase().includes('username')) {
        setFieldErrors({ username: msg })
      } else {
        setSubmitError(msg)
      }
      setSubmitting(false)
      return
    }

    const updatedProfile: Profile = json.profile
    setProfile(updatedProfile)
    setForm({
      username: updatedProfile.username,
      display_name: updatedProfile.display_name ?? '',
      bio: updatedProfile.bio ?? '',
    })
    setSuccessMessage('Profile updated successfully.')
    setSubmitting(false)
  }

  const isDirty =
    profile !== null &&
    (form.username !== profile.username ||
      form.display_name !== (profile.display_name ?? '') ||
      form.bio !== (profile.bio ?? ''))

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <span className="h-8 w-8 rounded-full border-4 border-[#C2F2E4] border-t-[#35C8B4] animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-xl mx-auto px-4 py-10 sm:py-16">

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0F1720]">Edit profile</h1>
          <p className="mt-1 text-sm text-[#5B6B73]">
            Update how you appear to others on PinDev.
          </p>
        </div>

        {/* Avatar row (display only for now) */}
        {profile && (
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C2F2E4] text-xl font-bold text-[#35C8B4] flex-shrink-0 overflow-hidden">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || profile.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                (profile.display_name || profile.username)
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0F1720]">
                {profile.display_name || profile.username}
              </p>
              <p className="text-xs text-[#5B6B73]">@{profile.username}</p>
              <p className="mt-1 text-xs text-[#5B6B73]">
                Avatar is set via your OAuth provider (GitHub / Google).
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>

          {/* ── Display name ── */}
          <div>
            <FieldLabel htmlFor="display-name">Display name</FieldLabel>
            <input
              id="display-name"
              type="text"
              value={form.display_name}
              onChange={(e) => setField('display_name', e.target.value)}
              placeholder="Your full name or nickname"
              maxLength={60}
              className="w-full rounded-2xl border border-[#E6ECEA] bg-white px-4 py-3 text-sm text-[#0F1720] placeholder:text-[#5B6B73] outline-none focus:border-[#35C8B4] focus:ring-2 focus:ring-[#35C8B4]/20 transition"
            />
            <div className="mt-1 flex items-start justify-between gap-2">
              <FieldHint>
                This is the name shown on your pins and profile. It can be
                anything.
              </FieldHint>
              <span className="flex-shrink-0 text-xs text-[#5B6B73]">
                {form.display_name.length}/60
              </span>
            </div>
            <FieldError message={fieldErrors.display_name} />
          </div>

          {/* ── Username ── */}
          <div>
            <FieldLabel htmlFor="username">Username *</FieldLabel>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#5B6B73] select-none">
                @
              </span>
              <input
                id="username"
                type="text"
                value={form.username}
                onChange={(e) =>
                  setField('username', e.target.value.toLowerCase())
                }
                placeholder="your_username"
                minLength={2}
                maxLength={30}
                required
                className={`w-full rounded-2xl border bg-white pl-8 pr-4 py-3 text-sm text-[#0F1720] placeholder:text-[#5B6B73] outline-none focus:ring-2 transition
                  ${fieldErrors.username
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-200/40'
                    : 'border-[#E6ECEA] focus:border-[#35C8B4] focus:ring-[#35C8B4]/20'
                  }`}
              />
            </div>
            <div className="mt-1 flex items-start justify-between gap-2">
              <FieldHint>
                Lowercase letters, numbers, and underscores only. This becomes
                your public URL:{' '}
                <span className="font-medium text-[#0F1720]">
                  pindev.app/profile/{form.username || 'username'}
                </span>
              </FieldHint>
              <span className="flex-shrink-0 text-xs text-[#5B6B73]">
                {form.username.length}/30
              </span>
            </div>
            <FieldError message={fieldErrors.username} />
          </div>

          {/* ── Bio ── */}
          <div>
            <FieldLabel htmlFor="bio">Bio</FieldLabel>
            <textarea
              id="bio"
              value={form.bio}
              onChange={(e) => setField('bio', e.target.value)}
              placeholder="Tell the world what you build…"
              maxLength={300}
              rows={3}
              className="w-full rounded-2xl border border-[#E6ECEA] bg-white px-4 py-3 text-sm text-[#0F1720] placeholder:text-[#5B6B73] outline-none focus:border-[#35C8B4] focus:ring-2 focus:ring-[#35C8B4]/20 transition resize-none"
            />
            <div className="mt-1 flex justify-end">
              <span className="text-xs text-[#5B6B73]">{form.bio.length}/300</span>
            </div>
            <FieldError message={fieldErrors.bio} />
          </div>

          {/* ── Feedback messages ── */}
          {submitError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
              {submitError}
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-3 rounded-2xl border border-[#A4CF4A] bg-[#EDF7BE] px-5 py-4 text-sm text-[#0F1720]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#A4CF4A"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !isDirty}
              className="flex-1 rounded-2xl bg-[#35C8B4] py-3 text-sm font-bold text-white hover:bg-[#2db5a3] disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Saving…
                </span>
              ) : (
                'Save changes'
              )}
            </button>

            {profile && (
              
                href={`/profile/${profile.username}`}
                className="rounded-2xl border border-[#E6ECEA] px-5 py-3 text-sm font-semibold text-[#0F1720] hover:bg-[#EDF7BE] transition-colors"
              >
                View profile
              </a>
            )}
          </div>
        </form>
      </div>
    </main>
  )
}