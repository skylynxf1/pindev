'use client'

import { useState, useEffect, useRef, useCallback, startTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PinCard from '@/components/feed/PinCard'
import LikeButton from '@/components/feed/LikeButton'
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
  games: { label: 'GAMES', id: 'games' },
  game: { label: 'GAMES', id: 'games' },
  gaming: { label: 'GAMES', id: 'games' },
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
const BATCH_SIZE = 20

/* ─────────────────────────────────────────────────────────────
   PIN DETAIL VIEW — Normal routed page.
   Pinterest-style layout:
   Desktop — left: selected pin + left-under suggestions
             right: "More like this" masonry board
   Mobile  — single column, unified suggestion grid

   Recommendations load client-side with infinite scroll.
   ───────────────────────────────────────────────────────────── */

interface PinDetailViewProps {
  pin: Pin
}

/* ── Category options for edit mode ── */
const CATEGORY_OPTIONS = [
  { id: 'design',     label: 'Design' },
  { id: 'website',    label: 'Website' },
  { id: 'app',        label: 'App' },
  { id: 'ai-tool',    label: 'AI Tool' },
  { id: 'vibecoding', label: 'VibeCoding' },
  { id: 'games',      label: 'Games' },
] as const

const CATEGORY_IDS = new Set<string>(CATEGORY_OPTIONS.map(c => c.id))

function getSelectedCategories(tags?: { id: string; name: string }[]): string[] {
  if (!tags?.length) return []
  return tags.map(t => t.name.toLowerCase()).filter(n => CATEGORY_IDS.has(n))
}

/* ── Shared edit-mode styles ── */
const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4,
  fontSize: '0.6875rem', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--text)',
  marginBottom: 8,
}

const editInputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface)',
  border: '1.5px solid var(--border)',
  borderRadius: 12,
  padding: '13px 16px',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.9rem',
  color: 'var(--text)',
  outline: 'none',
  transition: 'border-color 150ms, box-shadow 150ms',
  boxSizing: 'border-box' as const,
}

export default function PinDetailView({
  pin: initialPin,
}: PinDetailViewProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [pin, setPin] = useState(initialPin)
  const [flipped, setFlipped] = useState(false)
  const [similarPins, setSimilarPins] = useState<Pin[]>([])
  const [loadingSimilar, setLoadingSimilar] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [likesMap, setLikesMap] = useState<Record<string, { likeCount: number; likedByMe: boolean }>>({})
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const categories = getCategoriesFromTags(pin.tags)

  /* ── Edit mode state ── */
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(pin.title || '')
  const [editDescription, setEditDescription] = useState(pin.description || '')
  const [editLiveUrl, setEditLiveUrl] = useState(pin.live_url || '')
  const [editRepoUrl, setEditRepoUrl] = useState(pin.repo_url || '')
  const [editTags, setEditTags] = useState<string[]>(getSelectedCategories(pin.tags))
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({})
  const isOwner = !!userId && userId === pin.owner_id

  // Auto-enter edit mode when navigated with ?edit=true (from PinCard edit button)
  const editParam = searchParams.get('edit')
  useEffect(() => {
    if (editParam === 'true' && isOwner && !editing) {
      startEditing()
      // Clean the ?edit param from URL without a navigation
      router.replace(`/pin/${pin.id}`, { scroll: false })
    }
  }, [editParam, isOwner]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep pin in sync when parent provides a new pin (navigation)
  useEffect(() => {
    setPin(initialPin)
    setEditing(false)
  }, [initialPin])

  // Refs for IntersectionObserver closure freshness
  const hasMoreRef = useRef(hasMore)
  const loadingMoreRef = useRef(loadingMore)
  const loadingSimilarRef = useRef(loadingSimilar)
  const similarPinsRef = useRef(similarPins)
  useEffect(() => { hasMoreRef.current = hasMore }, [hasMore])
  useEffect(() => { loadingMoreRef.current = loadingMore }, [loadingMore])
  useEffect(() => { loadingSimilarRef.current = loadingSimilar }, [loadingSimilar])
  useEffect(() => { similarPinsRef.current = similarPins }, [similarPins])

  /* All recommendations flow into the right masonry board */

  // ── Initial fetch: recommendations + likes in one round-trip ──────────
  useEffect(() => {
    setLoadingSimilar(true)
    setSimilarPins([])
    setLikesMap({})
    setHasMore(true)
    const tagParams = pin.tags?.map((t) => t.name).join(',') ?? ''
    fetch(
      `/api/pins/${pin.id}/similar?tags=${encodeURIComponent(tagParams)}&limit=${BATCH_SIZE}`
    )
      .then((r) => r.json())
      .then((d) => {
        const pins: Pin[] = d.pins ?? []
        const likes: Record<string, { likeCount: number; likedByMe: boolean }> =
          d.likes ?? {}
        startTransition(() => {
          setSimilarPins(pins)
          setLikesMap(likes)
          setHasMore(pins.length >= BATCH_SIZE)
        })
      })
      .catch(() => {})
      .finally(() => setLoadingSimilar(false))
  }, [pin.id, pin.tags])

  // ── Load more (cursor-based infinite scroll) ─────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return
    const pins = similarPinsRef.current
    if (pins.length === 0) return

    setLoadingMore(true)
    loadingMoreRef.current = true

    const cursor = pins[pins.length - 1].created_at
    try {
      const res = await fetch(
        `/api/pins/${pin.id}/similar?limit=${BATCH_SIZE}&cursor=${encodeURIComponent(cursor)}`
      )
      const d = await res.json()
      const newPins: Pin[] = d.pins ?? []
      const newLikes: Record<string, { likeCount: number; likedByMe: boolean }> =
        d.likes ?? {}

      if (newPins.length === 0) {
        setHasMore(false)
      } else {
        startTransition(() => {
          setSimilarPins((prev) => {
            const ids = new Set(prev.map((p) => p.id))
            return [...prev, ...newPins.filter((p) => !ids.has(p.id))]
          })
          setLikesMap((prev) => ({ ...prev, ...newLikes }))
          setHasMore(newPins.length >= BATCH_SIZE)
        })
      }
    } catch {
      // silently fail — user can scroll again to retry
    } finally {
      setLoadingMore(false)
      loadingMoreRef.current = false
    }
  }, [pin.id])

  // ── IntersectionObserver for infinite scroll ─────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          hasMoreRef.current &&
          !loadingMoreRef.current &&
          !loadingSimilarRef.current
        ) {
          loadMore()
        }
      },
      { rootMargin: '600px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

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

  /* ── Edit mode helpers ── */
  function startEditing() {
    setEditTitle(pin.title || '')
    setEditDescription(pin.description || '')
    setEditLiveUrl(pin.live_url || '')
    setEditRepoUrl(pin.repo_url || '')
    setEditTags(getSelectedCategories(pin.tags))
    setEditError(null)
    setEditFieldErrors({})
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setEditError(null)
    setEditFieldErrors({})
  }

  function validateEdit(): boolean {
    const errors: Record<string, string> = {}
    if (!editTitle.trim()) errors.title = 'Title is required'
    if (editTitle.trim().length > 120) errors.title = 'Title must be 120 characters or fewer'
    if (!editLiveUrl.trim()) errors.liveUrl = 'Live URL is required'
    else {
      try {
        const u = new URL(editLiveUrl.trim())
        if (!u.protocol.startsWith('http')) errors.liveUrl = 'URL must start with http:// or https://'
      } catch {
        errors.liveUrl = 'Must be a valid URL'
      }
    }
    if (editRepoUrl.trim()) {
      try {
        const u = new URL(editRepoUrl.trim())
        if (!u.protocol.startsWith('http')) errors.repoUrl = 'URL must start with http:// or https://'
      } catch {
        errors.repoUrl = 'Must be a valid URL'
      }
    }
    if (editDescription.length > 2000) errors.description = 'Description must be 2000 characters or fewer'
    setEditFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleEditSave() {
    if (!validateEdit()) return
    setEditSaving(true)
    setEditError(null)

    try {
      const body = new FormData()
      body.append('title', editTitle.trim())
      body.append('description', editDescription.trim())
      body.append('live_url', editLiveUrl.trim())
      body.append('repo_url', editRepoUrl.trim())
      body.append('tags', editTags.join(','))

      const res = await fetch(`/api/pins/${pin.id}`, { method: 'PATCH', body })
      const json = await res.json()

      if (!res.ok) {
        if (res.status === 403) setEditError('You are not authorized to edit this pin.')
        else if (res.status === 401) setEditError('Please sign in to edit this pin.')
        else setEditError(json.error || 'Failed to save changes.')
        return
      }

      const updatedTags: Tag[] = editTags.map(name => {
        const existing = pin.tags?.find(t => t.name === name)
        return existing || { id: name, name }
      })

      setPin(prev => ({
        ...prev,
        title: editTitle.trim(),
        description: editDescription.trim(),
        live_url: editLiveUrl.trim(),
        repo_url: editRepoUrl.trim() || null,
        tags: updatedTags,
      }))
      setEditing(false)
    } catch {
      setEditError('Network error. Please try again.')
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <>
      <style>{`
        .pin-detail-layout {
          display: flex;
          flex-direction: column;
          gap: 24px;
          width: 100%;
        }
        @media (min-width: 1024px) {
          .pin-detail-layout {
            display: grid;
            grid-template-columns: minmax(380px, 44%) 1fr;
            gap: 28px;
            align-items: start;
          }
        }
        @media (min-width: 1536px) {
          .pin-detail-layout {
            grid-template-columns: minmax(480px, 42%) 1fr;
            gap: 36px;
          }
        }
        @media (min-width: 1920px) {
          .pin-detail-layout {
            grid-template-columns: minmax(540px, 40%) 1fr;
            gap: 40px;
          }
        }
        .pin-detail-hero {
          width: 100%;
        }
        @media (min-width: 1024px) {
          .pin-detail-hero {
            position: sticky;
            top: 80px;
            max-height: calc(100vh - 100px);
            overflow-y: auto;
            scrollbar-width: none;
          }
          .pin-detail-hero::-webkit-scrollbar { display: none; }
        }
        .pin-detail-board {
          min-width: 0;
        }
        .pin-masonry {
          columns: 220px;
          column-gap: 14px;
        }
        @media (min-width: 1280px) {
          .pin-masonry {
            columns: 240px;
            column-gap: 16px;
          }
        }
        @media (min-width: 1536px) {
          .pin-masonry {
            columns: 250px;
            column-gap: 16px;
          }
        }
        @media (min-width: 1920px) {
          .pin-masonry {
            columns: 270px;
            column-gap: 18px;
          }
        }
        .pin-masonry > * {
          break-inside: avoid;
          margin-bottom: 14px;
          content-visibility: auto;
          contain-intrinsic-size: auto 280px;
        }
        @media (min-width: 1280px) {
          .pin-masonry > * { margin-bottom: 16px; }
        }
        .pin-detail-hero-media {
          max-height: calc(100vh - 160px);
          overflow: hidden;
        }
        .pin-detail-hero-media img,
        .pin-detail-hero-media video {
          max-height: calc(100vh - 160px);
          object-fit: contain;
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <div className="pin-detail-layout">
        {/* ── HERO COLUMN: Selected pin ── */}
        <div className="pin-detail-hero" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                  className="pin-detail-hero-media"
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

          {editing ? (
            /* ── INLINE EDIT FORM ── */
            <div style={{
              background: '#fff',
              borderRadius: 20,
              border: '1.5px solid var(--border)',
              padding: '28px 24px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
                  Edit Pin
                </h2>
                <button
                  type="button"
                  onClick={cancelEditing}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--surface)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--muted)',
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--brume)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Title */}
              <div>
                <label style={labelStyle}>
                  Title <span style={{ color: 'var(--menthe)' }}>*</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 400 }}>{editTitle.length}/120</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  maxLength={120}
                  placeholder="My awesome project"
                  style={{
                    ...editInputStyle,
                    borderColor: editFieldErrors.title ? '#ef4444' : 'var(--border)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--menthe)'; e.currentTarget.style.boxShadow = 'var(--shadow-glow)'; e.currentTarget.style.background = '#fff' }}
                  onBlur={e => { e.currentTarget.style.borderColor = editFieldErrors.title ? '#ef4444' : 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'var(--surface)' }}
                />
                {editFieldErrors.title && <p style={{ marginTop: 4, fontSize: '0.75rem', color: '#ef4444' }}>{editFieldErrors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>
                  Description
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 400 }}>{editDescription.length}/2000</span>
                </label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="What does it do? What stack did you use?"
                  style={{
                    ...editInputStyle,
                    resize: 'none' as const,
                    lineHeight: 1.6,
                    borderColor: editFieldErrors.description ? '#ef4444' : 'var(--border)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--menthe)'; e.currentTarget.style.boxShadow = 'var(--shadow-glow)'; e.currentTarget.style.background = '#fff' }}
                  onBlur={e => { e.currentTarget.style.borderColor = editFieldErrors.description ? '#ef4444' : 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'var(--surface)' }}
                />
                {editFieldErrors.description && <p style={{ marginTop: 4, fontSize: '0.75rem', color: '#ef4444' }}>{editFieldErrors.description}</p>}
              </div>

              {/* Live URL */}
              <div>
                <label style={labelStyle}>
                  Live URL <span style={{ color: 'var(--menthe)' }}>*</span>
                </label>
                <input
                  type="url"
                  value={editLiveUrl}
                  onChange={e => setEditLiveUrl(e.target.value)}
                  placeholder="https://myproject.vercel.app"
                  style={{
                    ...editInputStyle,
                    borderColor: editFieldErrors.liveUrl ? '#ef4444' : 'var(--border)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--menthe)'; e.currentTarget.style.boxShadow = 'var(--shadow-glow)'; e.currentTarget.style.background = '#fff' }}
                  onBlur={e => { e.currentTarget.style.borderColor = editFieldErrors.liveUrl ? '#ef4444' : 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'var(--surface)' }}
                />
                {editFieldErrors.liveUrl && <p style={{ marginTop: 4, fontSize: '0.75rem', color: '#ef4444' }}>{editFieldErrors.liveUrl}</p>}
              </div>

              {/* Repo URL */}
              <div>
                <label style={labelStyle}>Repository URL</label>
                <input
                  type="url"
                  value={editRepoUrl}
                  onChange={e => setEditRepoUrl(e.target.value)}
                  placeholder="https://github.com/you/repo (optional)"
                  style={{
                    ...editInputStyle,
                    borderColor: editFieldErrors.repoUrl ? '#ef4444' : 'var(--border)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--menthe)'; e.currentTarget.style.boxShadow = 'var(--shadow-glow)'; e.currentTarget.style.background = '#fff' }}
                  onBlur={e => { e.currentTarget.style.borderColor = editFieldErrors.repoUrl ? '#ef4444' : 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'var(--surface)' }}
                />
                {editFieldErrors.repoUrl && <p style={{ marginTop: 4, fontSize: '0.75rem', color: '#ef4444' }}>{editFieldErrors.repoUrl}</p>}
              </div>

              {/* Category tags */}
              <div>
                <label style={labelStyle}>Category</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CATEGORY_OPTIONS.map(({ id, label }) => {
                    const active = editTags.includes(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          setEditTags(prev =>
                            prev.includes(id)
                              ? prev.filter(t => t !== id)
                              : [...prev, id]
                          )
                        }
                        style={{
                          padding: '7px 14px',
                          borderRadius: 10,
                          border: `1.5px solid ${active ? 'var(--menthe)' : 'var(--border)'}`,
                          background: active ? 'var(--menthe)' : 'var(--surface)',
                          color: active ? '#fff' : 'var(--text)',
                          fontSize: '0.8125rem',
                          fontWeight: active ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 120ms',
                        }}
                      >
                        {label}
                        {active && (
                          <svg style={{ marginLeft: 6, verticalAlign: 'middle' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Error banner */}
              {editError && (
                <div style={{
                  borderRadius: 12, border: '1px solid #fecaca',
                  background: '#fef2f2', padding: '10px 14px',
                  fontSize: '0.8125rem', color: '#dc2626',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {editError}
                </div>
              )}

              {/* Save / Cancel */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleEditSave}
                  disabled={editSaving}
                  style={{
                    flex: 1, padding: '12px 0',
                    borderRadius: 14, border: 'none',
                    background: editSaving ? 'var(--brume)' : 'var(--menthe)',
                    color: editSaving ? 'var(--muted)' : '#fff',
                    fontSize: '0.9375rem', fontWeight: 700,
                    cursor: editSaving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'opacity 150ms',
                  }}
                  onMouseEnter={e => { if (!editSaving) e.currentTarget.style.opacity = '0.88' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                >
                  {editSaving ? (
                    <>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.15)', borderTopColor: 'var(--muted)', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 14,
                    border: '1.5px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text)',
                    fontSize: '0.9375rem', fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'border-color 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--menthe)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* ── NORMAL VIEW ── */
            <>
              {/* Title + Edit button row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <h1 style={{ flex: 1, fontSize: '1.625rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.25, margin: 0, letterSpacing: '-0.02em' }}>
                  {pin.title}
                </h1>
                {isOwner && (
                  <button
                    type="button"
                    onClick={startEditing}
                    title="Edit pin"
                    style={{
                      flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px',
                      borderRadius: 12,
                      border: '1.5px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--text)',
                      fontSize: '0.8125rem', fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'border-color 150ms, background 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--menthe)'; e.currentTarget.style.background = 'var(--brume)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </button>
                )}
              </div>

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

              {/* Action buttons: Visit Live + Repo + Like */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
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
                <LikeButton
                  pinId={pin.id}
                  currentUserId={userId ?? undefined}
                  onAuthRequired={() => { window.location.href = '/login' }}
                />
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
            </>
          )}

        </div>

        {/* ── CONTINUOUS BOARD: All recommendations ── */}
        <div className="pin-detail-board">
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)', margin: '0 0 14px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            More like this
          </p>
          {loadingSimilar ? (
            <div className="pin-masonry">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ height: 140 + (i % 3) * 60, borderRadius: 16, background: 'var(--menthe-light)', opacity: 0.4 }} />
              ))}
            </div>
          ) : similarPins.length > 0 ? (
            <div className="pin-masonry">
              {similarPins.map((p) => (
                <div key={p.id}>
                  <PinCard
                    pin={p}
                    currentUserId={userId ?? undefined}
                    initialLikeCount={likesMap[p.id]?.likeCount}
                    initialLikedByMe={likesMap[p.id]?.likedByMe}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              No similar pins found.
            </p>
          )}
          {loadingMore && (
            <div className="pin-masonry" style={{ marginTop: 14 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`more-${i}`} className="animate-pulse" style={{ height: 140 + (i % 3) * 60, borderRadius: 16, background: 'var(--menthe-light)', opacity: 0.4 }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Infinite-scroll sentinel — below the entire grid, triggers loadMore */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* End of recommendations */}
      {!hasMore && !loadingSimilar && similarPins.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          margin: '24px 0 8px',
          color: 'var(--muted)',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            You&apos;ve seen it all
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
      )}
    </>
  )
}
