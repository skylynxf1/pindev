'use client'

import { useState, useEffect, useRef, useCallback, startTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PinCard from '@/components/feed/PinCard'
import LikeButton from '@/components/feed/LikeButton'
import { useEditPin } from '@/components/pin/EditPinProvider'
import type { Pin, Tag } from '@/types'
import CommentSection from '@/components/comments/CommentSection'
import type { CommentSectionHandle } from '@/components/comments/CommentSection'

/* ── Category helpers ── */
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

const BATCH_SIZE = 20

/* ── Share Dropdown (Pinterest-style) ── */

function ShareDropdown({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const url = typeof window !== 'undefined' ? window.location.href : ''
  const title = typeof document !== 'undefined' ? document.title : ''

  const shareOptions = [
    {
      label: 'Copy link',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      ),
      bg: '#111',
      color: '#fff',
      onClick: () => { navigator.clipboard.writeText(url).catch(() => {}); onClose() },
    },
    {
      label: 'WhatsApp',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      bg: '#25D366',
      color: '#fff',
      onClick: () => { window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank'); onClose() },
    },
    {
      label: 'Facebook',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      bg: '#1877F2',
      color: '#fff',
      onClick: () => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank'); onClose() },
    },
    {
      label: 'X',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      bg: '#111',
      color: '#fff',
      onClick: () => { window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank'); onClose() },
    },
  ]

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: 8,
        background: 'var(--bg)',
        border: '1.5px solid var(--border)',
        borderRadius: 16,
        padding: '16px 20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        zIndex: 30,
        minWidth: 220,
      }}
    >
      <p style={{ margin: '0 0 12px', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>Share</p>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        {shareOptions.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={opt.onClick}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: opt.bg, color: opt.color, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 150ms' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              {opt.icon}
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text)', fontWeight: 500 }}>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

interface PinDetailViewProps {
  pin: Pin
}

export default function PinDetailView({ pin: initialPin }: PinDetailViewProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { openEditModal } = useEditPin()
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
  const [showShare, setShowShare] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const commentRef = useRef<CommentSectionHandle>(null)
  const categories = getCategoriesFromTags(pin.tags)

  const isOwner = !!userId && userId === pin.owner_id

  const editParam = searchParams.get('edit')
  useEffect(() => {
    if (editParam === 'true' && isOwner) {
      openEditModal(pin, (updated) => setPin(prev => ({ ...prev, ...updated })))
      router.replace(`/pin/${pin.id}`, { scroll: false })
    }
  }, [editParam, isOwner]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setPin(initialPin) }, [initialPin])

  const hasMoreRef = useRef(hasMore)
  const loadingMoreRef = useRef(loadingMore)
  const loadingSimilarRef = useRef(loadingSimilar)
  const similarPinsRef = useRef(similarPins)
  useEffect(() => { hasMoreRef.current = hasMore }, [hasMore])
  useEffect(() => { loadingMoreRef.current = loadingMore }, [loadingMore])
  useEffect(() => { loadingSimilarRef.current = loadingSimilar }, [loadingSimilar])
  useEffect(() => { similarPinsRef.current = similarPins }, [similarPins])

  useEffect(() => {
    setLoadingSimilar(true)
    setSimilarPins([])
    setLikesMap({})
    setHasMore(true)
    const tagParams = pin.tags?.map((t) => t.name).join(',') ?? ''
    fetch(`/api/pins/${pin.id}/similar?tags=${encodeURIComponent(tagParams)}&limit=${BATCH_SIZE}`)
      .then((r) => r.json())
      .then((d) => {
        const pins: Pin[] = d.pins ?? []
        const likes: Record<string, { likeCount: number; likedByMe: boolean }> = d.likes ?? {}
        startTransition(() => { setSimilarPins(pins); setLikesMap(likes); setHasMore(pins.length >= BATCH_SIZE) })
      })
      .catch(() => {})
      .finally(() => setLoadingSimilar(false))
  }, [pin.id, pin.tags])

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return
    const pins = similarPinsRef.current
    if (pins.length === 0) return
    setLoadingMore(true)
    loadingMoreRef.current = true
    const cursor = pins[pins.length - 1].created_at
    try {
      const res = await fetch(`/api/pins/${pin.id}/similar?limit=${BATCH_SIZE}&cursor=${encodeURIComponent(cursor)}`)
      const d = await res.json()
      const newPins: Pin[] = d.pins ?? []
      const newLikes: Record<string, { likeCount: number; likedByMe: boolean }> = d.likes ?? {}
      if (newPins.length === 0) { setHasMore(false) }
      else { startTransition(() => { setSimilarPins((prev) => { const ids = new Set(prev.map((p) => p.id)); return [...prev, ...newPins.filter((p) => !ids.has(p.id))] }); setLikesMap((prev) => ({ ...prev, ...newLikes })); setHasMore(newPins.length >= BATCH_SIZE) }) }
    } catch {} finally { setLoadingMore(false); loadingMoreRef.current = false }
  }, [pin.id])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMoreRef.current && !loadingMoreRef.current && !loadingSimilarRef.current) loadMore()
    }, { rootMargin: '600px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => { setUserId(data.user?.id ?? null) })
  }, [])

  useEffect(() => { const v = videoRef.current; if (!v) return; v.muted = true; v.play().catch(() => {}) }, [pin.media_url])
  useEffect(() => { setFlipped(false) }, [pin.id])

  // Fetch initial saved state
  useEffect(() => {
    if (!userId) return
    fetch('/api/saved-pins?ids_only=true')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.ids?.includes(pin.id)) setSaved(true) })
      .catch(() => {})
  }, [userId, pin.id])

  async function handleSave() {
    if (!userId || saving) return
    const wasSaved = saved
    setSaved(!wasSaved) // optimistic
    setSaving(true)
    try {
      const res = await fetch('/api/saved-pins', {
        method: wasSaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_id: pin.id }),
      })
      if (!res.ok) setSaved(wasSaved) // rollback
    } catch {
      setSaved(wasSaved) // rollback
    } finally {
      setSaving(false)
    }
  }

  function handleEditClick() {
    openEditModal(pin, (updated) => setPin(prev => ({ ...prev, ...updated })))
  }

  function handleShare() {
    setShowShare(prev => !prev)
  }

  // ── Icon button helper ──

  const iconBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    background: 'transparent', border: 'none', padding: '8px 10px', borderRadius: 20,
    cursor: 'pointer', color: 'var(--muted)', transition: 'color 150ms, background 150ms',
    fontSize: '0.8125rem', fontWeight: 600,
  }

  return (
    <>
      <style>{`
        .pin-detail-layout { display: flex; flex-direction: column; gap: 24px; width: 100%; }
        @media (min-width: 1024px) { .pin-detail-layout { display: grid; grid-template-columns: minmax(380px, 44%) 1fr; gap: 28px; align-items: start; } }
        @media (min-width: 1536px) { .pin-detail-layout { grid-template-columns: minmax(480px, 42%) 1fr; gap: 36px; } }
        @media (min-width: 1920px) { .pin-detail-layout { grid-template-columns: minmax(540px, 40%) 1fr; gap: 40px; } }
        .pin-detail-hero { width: 100%; }
        @media (min-width: 1024px) { .pin-detail-hero { position: sticky; top: 80px; max-height: calc(100vh - 100px); overflow-y: auto; scrollbar-width: none; } .pin-detail-hero::-webkit-scrollbar { display: none; } }
        .pin-detail-board { min-width: 0; }
        .pin-masonry { columns: 220px; column-gap: 14px; }
        @media (min-width: 1280px) { .pin-masonry { columns: 240px; column-gap: 16px; } }
        @media (min-width: 1536px) { .pin-masonry { columns: 250px; column-gap: 16px; } }
        @media (min-width: 1920px) { .pin-masonry { columns: 270px; column-gap: 18px; } }
        .pin-masonry > * { break-inside: avoid; margin-bottom: 14px; content-visibility: auto; contain-intrinsic-size: auto 280px; }
        @media (min-width: 1280px) { .pin-masonry > * { margin-bottom: 16px; } }
        .pin-detail-hero-media { overflow: hidden; }
        .pin-detail-hero-media img, .pin-detail-hero-media video { object-fit: contain; }
        .pin-detail-action-bar { position: sticky; top: 0; z-index: 10; background: var(--bg); border-bottom: 1px solid var(--border); border-radius: 24px 24px 0 0; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <div className="pin-detail-layout">
        {/* ── HERO COLUMN ── */}
        <div className="pin-detail-hero">

          {/* ── UNIFIED PIN CARD ── */}
          <div style={{ borderRadius: 24, border: '1.5px solid var(--border)', background: 'var(--bg)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

            {/* ── STICKY ACTION BAR (above media, Pinterest-style) ── */}
            <div className="pin-detail-action-bar">
              {/* Left: Like, Comment, Share, Socials */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LikeButton
                  pinId={pin.id}
                  currentUserId={userId ?? undefined}
                  onAuthRequired={() => { window.location.href = '/login' }}
                  iconSize={20}
                />

                <button
                  onClick={() => commentRef.current?.scrollToComments()}
                  title="Comments"
                  style={iconBtnStyle}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--brume)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21a9 9 0 1 0-9-9c0 1.488.36 2.89 1 4.127L3 21l4.873-1c1.236.64 2.64 1 4.127 1z" />
                  </svg>
                </button>

                <div style={{ position: 'relative' }}>
                  <button
                    onClick={handleShare}
                    title="Share"
                    style={{ ...iconBtnStyle, background: showShare ? 'var(--brume)' : 'transparent', color: showShare ? 'var(--text)' : 'var(--muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--brume)' }}
                    onMouseLeave={(e) => { if (!showShare) { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' } }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </button>
                  {showShare && <ShareDropdown onClose={() => setShowShare(false)} />}
                </div>

                {pin.linkedin_url && (
                  <a href={pin.linkedin_url} target="_blank" rel="noopener noreferrer" title="LinkedIn"
                    style={{ ...iconBtnStyle, textDecoration: 'none' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.background = 'var(--brume)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                  </a>
                )}
                {pin.tiktok_url && (
                  <a href={pin.tiktok_url} target="_blank" rel="noopener noreferrer" title="TikTok"
                    style={{ ...iconBtnStyle, textDecoration: 'none' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.background = 'var(--brume)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/></svg>
                  </a>
                )}
                {pin.instagram_url && (
                  <a href={pin.instagram_url} target="_blank" rel="noopener noreferrer" title="Instagram"
                    style={{ ...iconBtnStyle, textDecoration: 'none' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.background = 'var(--brume)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  </a>
                )}
              </div>

              {/* Right: Edit + Save */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isOwner && (
                  <button type="button" onClick={handleEditClick} title="Edit pin"
                    style={{ ...iconBtnStyle }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--brume)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                )}
                {userId !== undefined && (
                  <button
                    onClick={handleSave}
                    disabled={saving || !userId}
                    title={!userId ? 'Sign in to save' : saved ? 'Unsave' : 'Save'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 18px', borderRadius: 20, border: 'none',
                      background: saved ? 'var(--menthe)' : 'var(--verveine)',
                      color: '#fff', fontSize: '0.875rem', fontWeight: 700,
                      cursor: saving || !userId ? 'default' : 'pointer',
                      opacity: !userId ? 0.5 : 1,
                      transition: 'background 150ms, opacity 150ms',
                    }}
                    onMouseEnter={(e) => { if (userId) e.currentTarget.style.background = saved ? '#ef4444' : 'var(--menthe)' }}
                    onMouseLeave={(e) => { if (userId) e.currentTarget.style.background = saved ? 'var(--menthe)' : 'var(--verveine)' }}
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
            </div>

            {/* ── MEDIA (dominant, large) ── */}
            <div style={{ position: 'relative' }}>
              <div style={{ perspective: '1200px' }}>
                <div style={{ position: 'relative', transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 0.45s ease', cursor: 'pointer' }}>
                  {/* Front face */}
                  <div className="pin-detail-hero-media" onClick={() => setFlipped(true)}
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', overflow: 'hidden', background: 'var(--brume)', position: 'relative' }}
                  >
                    {pin.media_type === 'video' ? (
                      <video ref={videoRef} src={pin.media_url} poster={pin.thumbnail_url} muted loop playsInline controls style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} />
                    ) : (
                      <Image src={pin.thumbnail_url} alt={pin.title || 'Project preview'} width={900} height={1200} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} unoptimized priority />
                    )}
                    <div style={{ position: 'absolute', bottom: 12, left: 14, fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600, letterSpacing: '0.04em', background: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: '4px 10px', backdropFilter: 'blur(4px)' }}>
                      click to flip
                    </div>
                  </div>

                  {/* Back face */}
                  <div onClick={() => setFlipped(false)}
                    style={{ position: 'absolute', inset: 0, transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', background: '#fff', padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', pointerEvents: flipped ? 'auto' : 'none' }}
                  >
                    <div style={{ textAlign: 'left', fontSize: '0.75rem', color: 'var(--muted-light)', fontWeight: 600 }}>
                      ↩ click to flip back
                    </div>
                    {categories.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {categories.map((cat) => (
                          <span key={cat.id} style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--menthe)' }}>{cat.label}</span>
                        ))}
                      </div>
                    )}
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3, margin: 0 }}>
                      {pin.title || 'Untitled'}
                    </h2>
                    {pin.description && (
                      <p style={{ fontSize: '0.9375rem', color: 'var(--muted)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>{pin.description}</p>
                    )}
                    {/* Visit Live + Repo on back */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                      <a href={pin.live_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        style={{ flex: 1, minWidth: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 14, background: 'var(--menthe)', color: '#fff', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none', transition: 'opacity 150ms' }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                        Visit Live
                      </a>
                      {pin.repo_url && (
                        <a href={pin.repo_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', transition: 'border-color 150ms, background 150ms' }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--menthe)'; e.currentTarget.style.background = 'var(--brume)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" /></svg>
                          Repo
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── LOWER CONTENT (title, author, comments — pushed down) ── */}
            <div style={{ padding: '20px 18px 18px' }}>

              {/* Title */}
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.25, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
                {pin.title}
              </h1>

              {/* Author */}
              {pin.profile && (
                <Link href={`/profile/${pin.profile.username}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--bg)', transition: 'border-color 150ms, background 150ms', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--menthe)'; e.currentTarget.style.background = 'var(--brume)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}
                  >
                    <div style={{ height: 36, width: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 700, flexShrink: 0, overflow: 'hidden', background: 'var(--brume)', color: 'var(--menthe)' }}>
                      {pin.profile.avatar_url ? (
                        <Image src={pin.profile.avatar_url} alt={pin.profile.display_name || pin.profile.username} width={36} height={36} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
                      ) : (
                        (pin.profile.display_name || pin.profile.username).charAt(0).toUpperCase()
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pin.profile.display_name || pin.profile.username}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>@{pin.profile.username}</p>
                    </div>
                    <svg style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--muted)' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  </div>
                </Link>
              )}

              {/* ── Divider ── */}
              <div style={{ height: 1, background: 'var(--text)', opacity: 0.08, margin: '16px 0' }} />

              {/* ── Comments ── */}
              <CommentSection ref={commentRef} pinId={pin.id} pinOwnerId={pin.owner_id} />

            </div>
          </div>

        </div>

        {/* ── BOARD ── */}
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
                <div key={p.id}><PinCard pin={p} currentUserId={userId ?? undefined} initialLikeCount={likesMap[p.id]?.likeCount} initialLikedByMe={likesMap[p.id]?.likedByMe} /></div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No similar pins found.</p>
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

      <div ref={sentinelRef} style={{ height: 1 }} />

      {!hasMore && !loadingSimilar && similarPins.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0 8px', color: 'var(--muted)' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>You&apos;ve seen it all</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
      )}
    </>
  )
}
