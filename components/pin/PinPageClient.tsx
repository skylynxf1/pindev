'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Pin } from '@/types'

export default function PinPageClient({ pin }: { pin: Pin }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // undefined = not yet checked, null = logged out, string = userId
  const [userId, setUserId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  async function handleSave() {
    if (!userId || saving || saved) return
    setSaving(true)
    try {
      const res = await fetch('/api/saved-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_id: pin.id }),
      })
      if (res.ok) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* ── Back button ── */}
        <button
          onClick={() => router.back()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginBottom: 24,
            padding: '8px 16px',
            borderRadius: 12,
            border: '1.5px solid var(--border)',
            background: 'var(--bg)',
            fontSize: '0.875rem', fontWeight: 600,
            color: 'var(--muted)',
            cursor: 'pointer',
            transition: 'color 150ms, border-color 150ms, background 150ms',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.color = 'var(--menthe)'
            el.style.borderColor = 'var(--menthe)'
            el.style.background = 'var(--brume)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.color = 'var(--muted)'
            el.style.borderColor = 'var(--border)'
            el.style.background = 'var(--bg)'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>

        {/* ── Main card ── */}
        <div
          className="flex flex-col md:flex-row"
          style={{
            borderRadius: 24,
            border: '1.5px solid var(--border)',
            background: '#fff',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}
        >

          {/* ── Media (left) ── */}
          <div
            className="w-full md:w-[52%]"
            style={{
              flexShrink: 0,
              background: 'var(--brume)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 280,
            }}
          >
            {pin.media_type === 'video' ? (
              <video
                src={pin.media_url}
                poster={pin.thumbnail_url}
                autoPlay
                muted
                loop
                playsInline
                controls
                style={{ width: '100%', height: 'auto', objectFit: 'contain', maxHeight: '72vh', display: 'block' }}
              />
            ) : (
              <Image
                src={pin.thumbnail_url}
                alt={pin.title || 'Project preview'}
                width={900}
                height={700}
                style={{ width: '100%', height: 'auto', objectFit: 'contain', maxHeight: '72vh', display: 'block' }}
                unoptimized
                priority
              />
            )}
          </div>

          {/* ── Details (right) ── */}
          <div style={{
            flex: 1,
            minWidth: 280,
            display: 'flex', flexDirection: 'column', gap: 20,
            padding: '32px 28px',
          }}>

            {/* Title */}
            {pin.title && (
              <h1 style={{
                fontSize: '1.5rem', fontWeight: 800,
                color: 'var(--text)', lineHeight: 1.25,
                margin: 0, letterSpacing: '-0.02em',
              }}>
                {pin.title}
              </h1>
            )}

            {/* Author */}
            {pin.profile && (
              <Link
                href={`/profile/${pin.profile.username}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  borderRadius: 16,
                  border: '1.5px solid var(--border)',
                  background: 'var(--bg)',
                  transition: 'border-color 150ms, background 150ms',
                  cursor: 'pointer',
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'var(--menthe)'
                    el.style.background = 'var(--brume)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'var(--border)'
                    el.style.background = 'var(--bg)'
                  }}
                >
                  <div style={{
                    height: 40, width: 40, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.875rem', fontWeight: 700, flexShrink: 0, overflow: 'hidden',
                    background: 'var(--brume)', color: 'var(--menthe)',
                  }}>
                    {pin.profile.avatar_url ? (
                      <Image
                        src={pin.profile.avatar_url}
                        alt={pin.profile.display_name || pin.profile.username}
                        width={40}
                        height={40}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        unoptimized
                      />
                    ) : (
                      (pin.profile.display_name || pin.profile.username).charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pin.profile.display_name || pin.profile.username}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      @{pin.profile.username}
                    </p>
                  </div>
                  <svg style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--muted)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </Link>
            )}

            {/* Description */}
            {pin.description && (
              <p style={{
                margin: 0,
                fontSize: '0.9375rem', color: 'var(--muted)',
                lineHeight: 1.65, whiteSpace: 'pre-wrap',
              }}>
                {pin.description}
              </p>
            )}

            {/* Tags */}
            {pin.tags && pin.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {pin.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/search?tag=${encodeURIComponent(tag.name)}`}
                    style={{
                      borderRadius: 9999,
                      border: '1.5px solid var(--border)',
                      background: 'var(--brume)',
                      padding: '4px 12px',
                      fontSize: '0.8125rem', fontWeight: 600,
                      color: 'var(--text)',
                      textDecoration: 'none',
                      transition: 'background 150ms, border-color 150ms',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLAnchorElement
                      el.style.background = '#EDF7BE'
                      el.style.borderColor = 'var(--menthe)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLAnchorElement
                      el.style.background = 'var(--brume)'
                      el.style.borderColor = 'var(--border)'
                    }}
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <a
                href={pin.live_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '11px 16px',
                  borderRadius: 14,
                  background: 'var(--menthe)',
                  color: '#fff',
                  fontSize: '0.9375rem', fontWeight: 700,
                  textDecoration: 'none',
                  transition: 'opacity 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Visit Live
              </a>

              {pin.repo_url && (
                <a
                  href={pin.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '11px 16px',
                    borderRadius: 14,
                    border: '1.5px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text)',
                    fontSize: '0.9375rem', fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'border-color 150ms, background 150ms',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.borderColor = 'var(--menthe)'
                    el.style.background = 'var(--brume)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.borderColor = 'var(--border)'
                    el.style.background = 'transparent'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  Repo
                </a>
              )}

              {/* Save button — shown only when auth state is known */}
              {userId !== undefined && (
                <button
                  onClick={handleSave}
                  disabled={saving || saved || !userId}
                  title={!userId ? 'Sign in to save' : saved ? 'Saved!' : 'Save this pin'}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '11px 20px',
                    borderRadius: 14,
                    border: 'none',
                    background: saved ? 'var(--menthe)' : 'var(--verveine)',
                    color: '#fff',
                    fontSize: '0.9375rem', fontWeight: 700,
                    cursor: saving || saved || !userId ? 'default' : 'pointer',
                    opacity: !userId ? 0.5 : 1,
                    transition: 'background 150ms, opacity 150ms',
                  }}
                  onMouseEnter={e => {
                    if (!saved && userId) (e.currentTarget as HTMLButtonElement).style.background = 'var(--menthe)'
                  }}
                  onMouseLeave={e => {
                    if (!saved && userId) (e.currentTarget as HTMLButtonElement).style.background = 'var(--verveine)'
                  }}
                >
                  {saving ? (
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#fff',
                      animation: 'spin .7s linear infinite',
                      display: 'inline-block',
                    }} />
                  ) : saved ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Saved
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                      Save
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </main>
  )
}
