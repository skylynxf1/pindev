'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PinCard from '@/components/feed/PinCard'
import type { Pin, Tag } from '@/types'

/* ── Category helpers (same mapping as PinCard) ── */
const CATEGORY_TAG_MAP: Record<string, { label: string; id: string }> = {
  website: { label: 'WEBSITE', id: 'website' },
  web: { label: 'WEBSITE', id: 'website' },
  landing: { label: 'WEBSITE', id: 'website' },
  app: { label: 'APP', id: 'app' },
  mobile: { label: 'APP', id: 'app' },
  ios: { label: 'APP', id: 'app' },
  android: { label: 'APP', id: 'app' },
  'ai-tool': { label: 'AI TOOL', id: 'ai-tool' },
  ai: { label: 'AI TOOL', id: 'ai-tool' },
  ml: { label: 'AI TOOL', id: 'ai-tool' },
  llm: { label: 'AI TOOL', id: 'ai-tool' },
  vibecoding: { label: 'VIBECODING', id: 'vibecoding' },
  'vibe-coding': { label: 'VIBECODING', id: 'vibecoding' },
  vibe: { label: 'VIBECODING', id: 'vibecoding' },
}

function getCategoriesFromTags(tags?: Tag[]) {
  if (!tags?.length) return []
  const seen = new Set<string>()
  const result: { label: string; id: string }[] = []
  for (const tag of tags) {
    const match = CATEGORY_TAG_MAP[tag.name.toLowerCase()]
    if (match && !seen.has(match.id)) {
      seen.add(match.id)
      result.push(match)
    }
  }
  return result
}

/* How many pins to show under the selected pin (left column) */
const LEFT_PIN_COUNT = 4

/* ─────────────────────────────────────────────────────────────
   PIN DETAIL VIEW — Normal routed page.
   Pinterest-style layout:
   Desktop — left: selected pin + left-under suggestions
             right: "More like this" masonry board
   Mobile  — single column, unified suggestion grid
   ───────────────────────────────────────────────────────────── */

interface PinDetailViewProps {
  pin: Pin
  initialSimilarPins?: Pin[]
}

export default function PinDetailView({
  pin,
  initialSimilarPins,
}: PinDetailViewProps) {
  const [flipped, setFlipped] = useState(false)
  const [similarPins, setSimilarPins] = useState<Pin[]>(
    initialSimilarPins ?? []
  )
  const [loadingSimilar, setLoadingSimilar] = useState(!initialSimilarPins)
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const categories = getCategoriesFromTags(pin.tags)

  /* Split recommendations: left-under vs right board (no duplicates) */
  const leftPins = useMemo(
    () => similarPins.slice(0, LEFT_PIN_COUNT),
    [similarPins]
  )
  const rightPins = useMemo(
    () => similarPins.slice(LEFT_PIN_COUNT),
    [similarPins]
  )

  // Fetch similar pins if not provided server-side
  useEffect(() => {
    if (initialSimilarPins) return
    setLoadingSimilar(true)
    fetch(`/api/pins/${pin.id}/similar`)
      .then((r) => r.json())
      .then((d) => setSimilarPins(d.pins ?? []))
      .catch(() => {})
      .finally(() => setLoadingSimilar(false))
  }, [pin.id, initialSimilarPins])

  // Auth check
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  // Video autoplay
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.play().catch(() => {})
  }, [pin.media_url])

  // Reset flip when pin changes
  useEffect(() => {
    setFlipped(false)
  }, [pin.id])

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
    <>
      <style>{`
        .pin-detail-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          width: 100%;
          align-items: start;
        }
        @media (min-width: 1024px) {
          .pin-detail-grid {
            grid-template-columns: clamp(420px, 40vw, 680px) 1fr;
          }
        }
        .pin-masonry {
          columns: 220px;
          column-gap: 14px;
        }
        .pin-masonry > * {
          break-inside: avoid;
          margin-bottom: 14px;
        }
        .desktop-only { display: none; }
        .mobile-only  { display: block; }
        @media (min-width: 1024px) {
          .desktop-only { display: block; }
          .mobile-only  { display: none; }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <div className="pin-detail-grid">
        {/* ── LEFT COLUMN: Selected pin + left-under suggestions ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pin card wrapper — position:relative for Save button */}
          <div style={{ position: 'relative' }}>
            {/* Flip card */}
            <div style={{ perspective: '1200px' }}>
              <div
                style={{
                  position: 'relative',
                  borderRadius: 20,
                  transformStyle: 'preserve-3d',
                  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  transition: 'transform 0.45s ease',
                  cursor: 'pointer',
                }}
              >
                {/* Front face: Media */}
                <div
                  onClick={() => setFlipped(true)}
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    borderRadius: 20,
                    overflow: 'hidden',
                    background: 'var(--brume)',
                    border: '1.5px solid var(--border)',
                    position: 'relative',
                  }}
                >
                  {pin.media_type === 'video' ? (
                    <video
                      ref={videoRef}
                      src={pin.media_url}
                      poster={pin.thumbnail_url}
                      muted
                      loop
                      playsInline
                      controls
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <Image
                      src={pin.thumbnail_url}
                      alt={pin.title || 'Project preview'}
                      width={900}
                      height={700}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        objectFit: 'contain',
                      }}
                      unoptimized
                      priority
                    />
                  )}

                  {/* Flip hint */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      left: 14,
                      fontSize: '0.75rem',
                      color: 'rgba(255,255,255,0.9)',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      background: 'rgba(0,0,0,0.35)',
                      borderRadius: 8,
                      padding: '4px 10px',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    click to flip
                  </div>

                  {/* Save button — INSIDE the front face so it shares the 3D context */}
                  {userId !== undefined && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSave() }}
                      disabled={saving || saved || !userId}
                      title={!userId ? 'Sign in to save' : saved ? 'Saved!' : 'Save this pin'}
                      style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 20,
                        border: 'none',
                        background: saved ? 'var(--menthe)' : 'var(--verveine)',
                        color: '#fff',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        cursor: saving || saved || !userId ? 'default' : 'pointer',
                        opacity: !userId ? 0.5 : 1,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        transition: 'background 150ms, opacity 150ms',
                      }}
                      onMouseEnter={(e) => { if (!saved && userId) e.currentTarget.style.background = 'var(--menthe)' }}
                      onMouseLeave={(e) => { if (!saved && userId) e.currentTarget.style.background = 'var(--verveine)' }}
                    >
                      {saving ? (
                        <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                      ) : saved ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          Saved
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                          Save
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Back face: Scrollable description */}
                <div
                  onClick={() => setFlipped(false)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transform: 'rotateY(180deg)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    borderRadius: 20,
                    background: '#fff',
                    border: '1.5px solid var(--border)',
                    padding: '24px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    overflowY: 'auto',
                    pointerEvents: flipped ? 'auto' : 'none',
                  }}
                >
                  <div style={{ textAlign: 'left', fontSize: '0.75rem', color: 'var(--muted-light)', fontWeight: 600 }}>
                    ↩ click to flip back
                  </div>

                  {categories.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {categories.map((cat) => (
                        <span key={cat.id} style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--menthe)' }}>
                          {cat.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3, margin: 0 }}>
                    {pin.title || 'Untitled'}
                  </h2>

                  {pin.description && (
                    <p style={{ fontSize: '0.9375rem', color: 'var(--muted)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {pin.description}
                    </p>
                  )}

                  <div style={{ flex: 1 }} />

                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={pin.live_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '10px 12px', borderRadius: 12, border: 'none', background: 'var(--menthe)', color: '#fff', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none', transition: 'opacity 150ms' }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                    >
                      Visit Live
                    </a>
                    {pin.repo_url && (
                      <a href={pin.repo_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '10px 12px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', transition: 'border-color 150ms' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--menthe)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                      >
                        View Repo
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Title */}
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.25, margin: 0, letterSpacing: '-0.02em' }}>
            {pin.title}
          </h1>

          {/* Author */}
          {pin.profile && (
            <Link href={`/profile/${pin.profile.username}`} style={{ textDecoration: 'none' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--bg)', transition: 'border-color 150ms, background 150ms', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--menthe)'; e.currentTarget.style.background = 'var(--brume)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}
              >
                <div style={{ height: 40, width: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0, overflow: 'hidden', background: 'var(--brume)', color: 'var(--menthe)' }}>
                  {pin.profile.avatar_url ? (
                    <Image src={pin.profile.avatar_url} alt={pin.profile.display_name || pin.profile.username} width={40} height={40} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
                  ) : (
                    (pin.profile.display_name || pin.profile.username).charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pin.profile.display_name || pin.profile.username}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--muted)' }}>
                    @{pin.profile.username}
                  </p>
                </div>
                <svg style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--muted)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </Link>
          )}

          {/* Action buttons: Visit Live + Repo */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={pin.live_url} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 16px', borderRadius: 14, background: 'var(--menthe)', color: '#fff', fontSize: '0.9375rem', fontWeight: 700, textDecoration: 'none', transition: 'opacity 150ms' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Visit Live
            </a>
            {pin.repo_url && (
              <a href={pin.repo_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 16px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: '0.9375rem', fontWeight: 600, textDecoration: 'none', transition: 'border-color 150ms, background 150ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--menthe)'; e.currentTarget.style.background = 'var(--brume)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                Repo
              </a>
            )}
          </div>

          {/* ── Left-under suggestions (desktop only) ── */}
          {!loadingSimilar && leftPins.length > 0 && (
            <div className="desktop-only" style={{ marginTop: 12 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>
                You might also like
              </h3>
              <div className="pin-masonry">
                {leftPins.map((p) => (
                  <div key={p.id}>
                    <PinCard pin={p} currentUserId={userId ?? undefined} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {loadingSimilar && (
            <div className="desktop-only" style={{ marginTop: 12 }}>
              <div className="pin-masonry">
                {Array.from({ length: LEFT_PIN_COUNT }).map((_, i) => (
                  <div key={i} className="animate-pulse" style={{ height: 160 + (i % 3) * 40, borderRadius: 16, background: 'var(--menthe-light)', opacity: 0.4 }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Board (desktop only) ── */}
        <div className="desktop-only">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 16px', letterSpacing: '-0.01em' }}>
            More like this
          </h2>
          {loadingSimilar ? (
            <div className="pin-masonry">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ height: 140 + (i % 3) * 60, borderRadius: 16, background: 'var(--menthe-light)', opacity: 0.4 }} />
              ))}
            </div>
          ) : rightPins.length > 0 ? (
            <div className="pin-masonry">
              {rightPins.map((p) => (
                <div key={p.id}>
                  <PinCard pin={p} currentUserId={userId ?? undefined} />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              No similar pins found.
            </p>
          )}
        </div>

        {/* ── MOBILE: Unified suggestion grid ── */}
        <div className="mobile-only">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 16px', letterSpacing: '-0.01em' }}>
            More like this
          </h2>
          {loadingSimilar ? (
            <div className="pin-masonry">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ height: 140 + (i % 3) * 60, borderRadius: 16, background: 'var(--menthe-light)', opacity: 0.4 }} />
              ))}
            </div>
          ) : similarPins.length > 0 ? (
            <div className="pin-masonry">
              {similarPins.map((p) => (
                <div key={p.id}>
                  <PinCard pin={p} currentUserId={userId ?? undefined} />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              No similar pins found.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
