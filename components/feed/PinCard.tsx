'use client'

import Link from 'next/link'
import Image from 'next/image'
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
      <span
        className="font-bold"
        style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--menthe)' }}
      >
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
  onSave: (pin: Pin) => void
}

export default function PinCard({ pin, onSave }: PinCardProps) {
  const category = getCategoryFromTags(pin.tags)

  return (
    <div
      className="group relative rounded-2xl overflow-hidden border bg-white transition-shadow hover:shadow-md"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Thumbnail */}
      <Link href={`/pin/${pin.id}`} className="block relative">
        <div className="relative w-full" style={{ background: 'var(--brume)', minHeight: '180px' }}>
          <Image
            src={pin.thumbnail_url}
            alt={pin.title || 'Project preview'}
            width={400}
            height={300}
            className="w-full h-auto object-cover"
            unoptimized
          />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />

        {/* Save button on hover */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onSave(pin)
          }}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-2xl px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: 'var(--verveine)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--menthe)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--verveine)' }}
        >
          Save
        </button>
      </Link>

      {/* Card body */}
      <div className="p-3">
        {/* Category badge */}
        {category && (
          <div className="mb-1.5">
            <CategoryBadge id={category.id} label={category.label} />
          </div>
        )}

        {/* Title */}
        {pin.title && (
          <Link href={`/pin/${pin.id}`}>
            <p
              className="text-sm font-semibold line-clamp-2 transition-colors"
              style={{ color: 'var(--text)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--menthe)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
            >
              {pin.title}
            </p>
          </Link>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          {/* Author */}
          {pin.profile && (
            <Link
              href={`/profile/${pin.profile.username}`}
              className="flex items-center gap-1.5 min-w-0"
            >
              <div
                className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 overflow-hidden"
                style={{ background: 'var(--brume)', color: 'var(--menthe)' }}
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
                className="text-xs truncate transition-colors"
                style={{ color: 'var(--muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--menthe)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
              >
                {pin.profile.display_name || pin.profile.username}
              </span>
            </Link>
          )}

          {/* Live link */}
          <a
            href={pin.live_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 inline-flex items-center gap-1 text-xs hover:underline"
            style={{ color: 'var(--menthe)' }}
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
  )
}
