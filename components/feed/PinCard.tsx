'use client'

import { useState, useEffect, useRef, memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Pin, Tag } from '@/types'
import EditPinModal from './EditPinModal'
import LikeButton from './LikeButton'

/* ─────────────────────────────────────────────────────────────
   CATEGORY DETECTION
   ───────────────────────────────────────────────────────────── */
const CATEGORY_TAG_MAP: Record<string, { label: string; id: string }> = {
  design:        { label: 'DESIGN',     id: 'design' },
  ui:            { label: 'DESIGN',     id: 'design' },
  ux:            { label: 'DESIGN',     id: 'design' },
  website:       { label: 'WEBSITE',    id: 'website' },
  web:           { label: 'WEBSITE',    id: 'website' },
  landing:       { label: 'WEBSITE',    id: 'website' },
  app:           { label: 'APP',        id: 'app' },
  mobile:        { label: 'APP',        id: 'app' },
  ios:           { label: 'APP',        id: 'app' },
  android:       { label: 'APP',        id: 'app' },
  'ai-tool':     { label: 'AI TOOL',   id: 'ai-tool' },
  ai:            { label: 'AI TOOL',   id: 'ai-tool' },
  ml:            { label: 'AI TOOL',   id: 'ai-tool' },
  llm:           { label: 'AI TOOL',   id: 'ai-tool' },
  vibecoding:    { label: 'VIBECODING', id: 'vibecoding' },
  'vibe-coding': { label: 'VIBECODING', id: 'vibecoding' },
  vibe:          { label: 'VIBECODING', id: 'vibecoding' },
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

/* ─────────────────────────────────────────────────────────────
   CATEGORY BADGE
   ───────────────────────────────────────────────────────────── */
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  design: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  website: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  app: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  ),
  'ai-tool': (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  ),
  vibecoding: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
}

function CategoryBadge({ id, label }: { id: string; label: string }) {
  return (
    <div className="flex items-center gap-1" style={{ color: 'var(--menthe)' }}>
      {CATEGORY_ICONS[id]}
      <span className="font-bold" style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--menthe)' }}>
        {label}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   VIDEO PREVIEW
   ───────────────────────────────────────────────────────────── */
function VideoPreview({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = true
    v.play().catch(() => {})
  }, [src])
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      style={{ width: '100%', height: 'auto', display: 'block' }}
    />
  )
}

/* ─────────────────────────────────────────────────────────────
   PIN CARD — Static grid card (no flip).
   Clicking the card opens the Pin Detail View.
   ───────────────────────────────────────────────────────────── */
interface PinCardProps {
  pin: Pin
  onSave?: (pin: Pin) => void
  currentUserId?: string
  onDelete?: (id: string) => void
  onUnsave?: (id: string) => void
  onEdit?: (updated: Pin) => void
  onAdminDelete?: (id: string) => void
  onFeatureToggle?: (id: string, featuredUntil: string | null) => void
  isAdmin?: boolean
  initialSaved?: boolean
  initialLikeCount?: number
  initialLikedByMe?: boolean
  onAuthRequired?: () => void
}

export default memo(function PinCard({ pin: initialPin, onSave, currentUserId, onDelete, onUnsave, onEdit, onAdminDelete, onFeatureToggle, isAdmin, initialSaved, initialLikeCount, initialLikedByMe, onAuthRequired }: PinCardProps) {
  const router = useRouter()
  const [pin, setPin] = useState(initialPin)
  const [hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saved, setSaved] = useState(initialSaved ?? false)
  const [saving, setSaving] = useState(false)
  const [unsaving, setUnsaving] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [adminConfirm, setAdminConfirm] = useState(false)
  const [adminDeleting, setAdminDeleting] = useState(false)
  const [featuring, setFeaturing] = useState(false)
  const categories = getCategoriesFromTags(pin.tags)
  const isOwner = !!currentUserId && currentUserId === pin.owner_id
  const isFeatured = !!pin.featured_until && new Date(pin.featured_until) > new Date()

  // Keep pin in sync when parent updates
  useEffect(() => { setPin(initialPin) }, [initialPin])

  // Sync saved state when initialSaved loads asynchronously
  useEffect(() => {
    setSaved(initialSaved ?? false)
  }, [initialSaved])

  function handleCardClick() {
    router.push(`/pin/${pin.id}`)
  }

  async function handleSaveClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!currentUserId) {
      onSave?.(pin)
      return
    }
    if (saved) {
      doUnsave()
      return
    }
    doSave()
  }

  async function doSave() {
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

  async function doUnsave() {
    setUnsaving(true)
    try {
      const res = await fetch('/api/saved-pins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_id: pin.id }),
      })
      if (res.ok) {
        setSaved(false)
        onUnsave?.(pin.id)
      }
    } finally {
      setUnsaving(false)
    }
  }

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    await doUnsave()
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    const res = await fetch(`/api/pins/${pin.id}`, { method: 'DELETE' })
    if (res.ok) {
      onDelete?.(pin.id)
    } else {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  async function handleAdminDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!adminConfirm) { setAdminConfirm(true); return }
    setAdminDeleting(true)
    const res = await fetch(`/api/admin/pins/${pin.id}`, { method: 'DELETE' })
    if (res.ok) {
      onAdminDelete?.(pin.id)
    } else {
      setAdminDeleting(false)
      setAdminConfirm(false)
    }
  }

  async function handleFeatureClick(e: React.MouseEvent) {
    e.stopPropagation()
    setFeaturing(true)
    try {
      const res = await fetch(`/api/admin/pins/${pin.id}/feature`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setPin(prev => ({ ...prev, featured_until: data.featured_until }))
        onFeatureToggle?.(pin.id, data.featured_until)
      }
    } finally {
      setFeaturing(false)
    }
  }

  return (
    <div>
      {/* Card — clicking anywhere (except buttons/links) opens detail view */}
      <div
        onClick={handleCardClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          borderRadius: 18,
          border: '1px solid var(--border)',
          background: '#fff',
          boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
          transition: 'box-shadow 200ms',
          cursor: 'pointer',
        }}
      >
        {/* Thumbnail */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            background: 'var(--brume)',
            minHeight: '180px',
            borderRadius: '18px 18px 0 0',
            overflow: 'hidden',
          }}
        >
          {pin.media_type === 'video' ? (
            <VideoPreview src={pin.media_url} poster={pin.thumbnail_url} />
          ) : (
            <Image
              src={pin.thumbnail_url}
              alt={pin.title || 'Project preview'}
              width={400}
              height={300}
              className="w-full h-auto object-cover"
              unoptimized
            />
          )}

          {/* Featured badge — always visible when pin is featured */}
          {isFeatured && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(245,158,11,0.88)',
                borderRadius: 8,
                padding: '3px 7px',
                backdropFilter: 'blur(4px)',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff" stroke="none" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', letterSpacing: '0.06em', lineHeight: 1 }}>FEATURED</span>
            </div>
          )}

          {/* Hover overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: hovered ? 'rgba(0,0,0,0.08)' : 'transparent',
              transition: 'background 200ms',
              pointerEvents: 'none',
            }}
          />

          {/* Top-right button row */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              display: 'flex',
              gap: 6,
              opacity: hovered ? 1 : 0,
              pointerEvents: hovered ? 'auto' : 'none',
              transition: 'opacity 200ms',
            }}
          >
            {/* Save / unsave button — hidden on Saved board (X button is the only remove control there) */}
            {!onUnsave && (
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={saving || unsaving}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  borderRadius: 14, padding: '5px 12px',
                  fontSize: '0.75rem', fontWeight: 700, color: '#fff',
                  border: 'none',
                  background: saved ? 'var(--menthe)' : 'var(--verveine)',
                  cursor: (saving || unsaving) ? 'not-allowed' : 'pointer',
                  transition: 'background 200ms',
                }}
                onMouseEnter={e => { if (!saved) (e.currentTarget as HTMLElement).style.background = 'var(--menthe)' }}
                onMouseLeave={e => { if (!saved) (e.currentTarget as HTMLElement).style.background = 'var(--verveine)' }}
              >
                {(saving || unsaving) ? (
                  <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                ) : saved ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Saved
                  </>
                ) : 'Save'}
              </button>
            )}

            {/* Admin feature toggle */}
            {isAdmin && (
              <button
                type="button"
                onClick={handleFeatureClick}
                disabled={featuring}
                title={isFeatured ? 'Remove from featured' : 'Feature this pin (7 days)'}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 14, padding: '5px 8px',
                  border: `1.5px solid ${isFeatured ? '#f59e0b' : 'rgba(245,158,11,0.55)'}`,
                  background: isFeatured ? 'rgba(245,158,11,0.88)' : 'rgba(0,0,0,0.45)',
                  color: '#fff',
                  cursor: featuring ? 'not-allowed' : 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => {
                  if (!featuring) {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'rgba(245,158,11,0.92)'
                    el.style.borderColor = '#f59e0b'
                  }
                }}
                onMouseLeave={e => {
                  if (!featuring) {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = isFeatured ? 'rgba(245,158,11,0.88)' : 'rgba(0,0,0,0.45)'
                    el.style.borderColor = isFeatured ? '#f59e0b' : 'rgba(245,158,11,0.55)'
                  }
                }}
              >
                {featuring ? (
                  <span style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={isFeatured ? '#fff' : 'none'} stroke="#fff" strokeWidth="2" aria-hidden="true">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                )}
              </button>
            )}

            {/* Remove from saved — visible on saved page */}
            {onUnsave && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={unsaving}
                title="Remove from saved"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 14, padding: '5px 8px',
                  border: 'none', color: '#fff',
                  background: 'rgba(239,68,68,0.80)',
                  cursor: unsaving ? 'not-allowed' : 'pointer',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ef4444' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.80)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            )}

            {/* Admin delete — shown to admin for pins they don't own */}
            {isAdmin && !isOwner && (
              <button
                type="button"
                onClick={handleAdminDelete}
                disabled={adminDeleting}
                title="Admin delete"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 14,
                  padding: adminConfirm ? '5px 10px' : '5px 8px',
                  fontSize: '0.75rem', fontWeight: 700,
                  color: '#fff', border: 'none',
                  background: adminConfirm ? '#dc2626' : 'rgba(220,38,38,0.75)',
                  cursor: adminDeleting ? 'not-allowed' : 'pointer',
                  gap: 4, transition: 'background 150ms',
                  whiteSpace: 'nowrap',
                }}
              >
                {adminDeleting ? (
                  <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                ) : adminConfirm ? (
                  'Confirm admin delete?'
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                    ⚑
                  </>
                )}
              </button>
            )}

            {/* Delete button — owner only */}
            {isOwner && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 14,
                  padding: confirmDelete ? '5px 10px' : '5px 8px',
                  fontSize: '0.75rem', fontWeight: 700,
                  color: '#fff', border: 'none',
                  background: confirmDelete ? '#ef4444' : 'rgba(0,0,0,0.55)',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  gap: 4, transition: 'background 150ms',
                  whiteSpace: 'nowrap',
                }}
              >
                {deleting ? (
                  <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                ) : confirmDelete ? (
                  'Confirm delete?'
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                )}
              </button>
            )}

            {/* Edit button — owner only */}
            {isOwner && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setShowEditModal(true) }}
                title="Edit pin"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 14, padding: '5px 8px',
                  border: 'none', color: '#fff',
                  background: 'rgba(0,0,0,0.55)',
                  cursor: 'pointer',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--menthe)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.55)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: '10px 12px 12px' }}>
          {categories.length > 0 && (
            <div style={{ marginBottom: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {categories.map(cat => (
                <CategoryBadge key={cat.id} id={cat.id} label={cat.label} />
              ))}
            </div>
          )}

          {pin.title && (
            <p
              className="line-clamp-2"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text)',
                margin: 0,
                lineHeight: 1.35,
                transition: 'color 120ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--menthe)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
            >
              {pin.title}
            </p>
          )}

          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {pin.profile && (
              <Link
                href={`/profile/${pin.profile.username}`}
                onClick={e => e.stopPropagation()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, textDecoration: 'none' }}
              >
                <div
                  style={{
                    height: 20, width: 20, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 700, flexShrink: 0, overflow: 'hidden',
                    background: 'var(--brume)', color: 'var(--menthe)',
                  }}
                >
                  {pin.profile.avatar_url ? (
                    <Image
                      src={pin.profile.avatar_url}
                      alt={pin.profile.display_name || pin.profile.username}
                      width={20}
                      height={20}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    (pin.profile.display_name || pin.profile.username).charAt(0).toUpperCase()
                  )}
                </div>
                <span
                  className="truncate"
                  style={{ fontSize: '0.75rem', color: 'var(--muted)', transition: 'color 120ms' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--menthe)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
                >
                  {pin.profile.display_name || pin.profile.username}
                </span>
              </Link>
            )}

            <a
              href={pin.live_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.75rem',
                color: 'var(--menthe)',
                textDecoration: 'none',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Live
            </a>

            <LikeButton
              pinId={pin.id}
              initialLikeCount={initialLikeCount}
              initialLikedByMe={initialLikedByMe}
              currentUserId={currentUserId}
              onAuthRequired={onAuthRequired}
            />
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Edit modal */}
      {showEditModal && (
        <EditPinModal
          pin={pin}
          onClose={() => setShowEditModal(false)}
          onSaved={updated => {
            setPin(updated)
            setShowEditModal(false)
            onEdit?.(updated)
          }}
        />
      )}
    </div>
  )
})
