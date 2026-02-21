'use client'

import { useState } from 'react'
import Image from 'next/image'
import BoardPickerModal from '@/components/boards/BoardPickerModal'
import type { Pin, Tag } from '@/types'

/* ─────────────────────────────────────────────────────────────
   CATEGORY DETECTION
   ───────────────────────────────────────────────────────────── */
const CATEGORY_TAG_MAP: Record<string, { label: string; id: string }> = {
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

function getCategoryFromTags(tags?: Tag[]) {
  if (!tags?.length) return null
  for (const tag of tags) {
    const match = CATEGORY_TAG_MAP[tag.name.toLowerCase()]
    if (match) return match
  }
  return null
}

/* ─────────────────────────────────────────────────────────────
   CATEGORY BADGE
   ───────────────────────────────────────────────────────────── */
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
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
   PIN CARD
   ───────────────────────────────────────────────────────────── */
interface PinCardProps {
  pin: Pin
  onSave?: (pin: Pin) => void
  currentUserId?: string
  onDelete?: (id: string) => void
}

export default function PinCard({ pin, onSave, currentUserId, onDelete }: PinCardProps) {
  const [flipped, setFlipped] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const category = getCategoryFromTags(pin.tags)
  const isOwner = !!currentUserId && currentUserId === pin.owner_id

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation()
    if (!currentUserId) {
      onSave?.(pin)
      return
    }
    if (saved) return
    setShowPicker(true)
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

  return (
    /* Perspective wrapper — required for proper 3D depth */
    <div style={{ perspective: '1000px' }}>
      {/* Rotating card */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          borderRadius: 18,
          border: '1px solid var(--border)',
          background: '#fff',
          boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.45s ease, box-shadow 200ms',
        }}
      >
        {/* ── FRONT FACE ── */}
        <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: 18 }}>
          {/* Thumbnail — click flips the card */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              background: 'var(--brume)',
              minHeight: '180px',
              borderRadius: '18px 18px 0 0',
              overflow: 'hidden',
              cursor: 'pointer',
            }}
            onClick={() => setFlipped(true)}
          >
            <Image
              src={pin.thumbnail_url}
              alt={pin.title || 'Project preview'}
              width={400}
              height={300}
              className="w-full h-auto object-cover"
              unoptimized
            />

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
              {/* Save button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saved}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  borderRadius: 14, padding: '5px 12px',
                  fontSize: '0.75rem', fontWeight: 700, color: '#fff',
                  border: 'none',
                  background: saved ? 'var(--menthe)' : 'var(--verveine)',
                  cursor: saved ? 'default' : 'pointer',
                  transition: 'background 200ms',
                }}
                onMouseEnter={e => { if (!saved) (e.currentTarget as HTMLElement).style.background = 'var(--menthe)' }}
                onMouseLeave={e => { if (!saved) (e.currentTarget as HTMLElement).style.background = 'var(--verveine)' }}
              >
                {saved ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Saved
                  </>
                ) : 'Save'}
              </button>

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
            </div>

            {/* Flip hint */}
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                left: 10,
                fontSize: '10px',
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 600,
                letterSpacing: '0.04em',
                opacity: hovered ? 1 : 0,
                transition: 'opacity 200ms',
                pointerEvents: 'none',
              }}
            >
              tap to flip
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: '10px 12px 12px' }}>
            {category && (
              <div style={{ marginBottom: 6 }}>
                <CategoryBadge id={category.id} label={category.label} />
              </div>
            )}

            {pin.title && (
              <p
                className="line-clamp-2"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text)',
                  cursor: 'pointer',
                  margin: 0,
                  lineHeight: 1.35,
                  transition: 'color 120ms',
                }}
                onClick={() => setFlipped(true)}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--menthe)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
              >
                {pin.title}
              </p>
            )}

            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              {pin.profile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
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
                    style={{ fontSize: '0.75rem', color: 'var(--muted)' }}
                  >
                    {pin.profile.display_name || pin.profile.username}
                  </span>
                </div>
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
            </div>
          </div>
        </div>

        {/* ── BACK FACE ── */}
        <div
          onClick={() => setFlipped(false)}
          style={{
            position: 'absolute',
            inset: 0,
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: 'var(--bg)',
            borderRadius: 18,
            padding: '18px 16px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            cursor: 'pointer',
            overflow: 'hidden',
            pointerEvents: flipped ? 'auto' : 'none',
          }}
        >
          {/* Flip back hint */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 12,
              fontSize: '10px',
              color: 'var(--muted-light)',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            tap to flip ↩
          </div>

          {/* Category badge */}
          {category && <CategoryBadge id={category.id} label={category.label} />}

          {/* Title */}
          <h3
            style={{
              fontSize: '0.9375rem',
              fontWeight: 800,
              color: 'var(--text)',
              lineHeight: 1.3,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {pin.title || 'Untitled'}
          </h3>

          {/* Description */}
          {pin.description ? (
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--muted)',
                lineHeight: 1.55,
                margin: 0,
                flex: 1,
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {pin.description}
            </p>
          ) : (
            <div style={{ flex: 1 }} />
          )}

          <div style={{ flex: 1 }} />

          {/* CTA links */}
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={pin.live_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                padding: '8px 10px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--menthe)',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'opacity 150ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Visit
            </a>

            {pin.repo_url && (
              <a
                href={pin.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'border-color 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--menthe)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                </svg>
                Repo
              </a>
            )}
          </div>

          {/* Author */}
          {pin.profile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  height: 18, width: 18, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: 700, flexShrink: 0, overflow: 'hidden',
                  background: 'var(--brume)', color: 'var(--menthe)',
                }}
              >
                {pin.profile.avatar_url ? (
                  <Image
                    src={pin.profile.avatar_url}
                    alt={pin.profile.display_name || pin.profile.username}
                    width={18}
                    height={18}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  (pin.profile.display_name || pin.profile.username).charAt(0).toUpperCase()
                )}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                {pin.profile.display_name || pin.profile.username}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Board picker modal */}
      {showPicker && (
        <BoardPickerModal
          pin={pin}
          onClose={() => setShowPicker(false)}
          onSaved={() => setSaved(true)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
