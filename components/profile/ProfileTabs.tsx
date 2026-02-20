'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Pin, Board } from '@/types'

/* ─────────────────────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────────────────────── */
type OwnTab = 'my-pins' | 'saved' | 'boards'
type OtherTab = 'pins' | 'boards'
type Tab = OwnTab | OtherTab

interface ProfileTabsProps {
  pins: Pin[]
  boards: Board[]
  isOwnProfile: boolean
}

/* ─────────────────────────────────────────────────────────────
   EMPTY STATE
   ───────────────────────────────────────────────────────────── */
function EmptyState({ icon, title, sub, ctaHref, ctaLabel }: {
  icon: React.ReactNode
  title: string
  sub: string
  ctaHref?: string
  ctaLabel?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
      <div style={{ marginBottom: 16, width: 56, height: 56, borderRadius: '50%', background: '#C2F2E4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <p style={{ fontSize: '1rem', fontWeight: 700, color: '#0F1720', margin: '0 0 6px' }}>{title}</p>
      <p style={{ fontSize: '0.875rem', color: '#5B6B73', margin: 0 }}>{sub}</p>
      {ctaHref && (
        <Link
          href={ctaHref}
          style={{
            marginTop: 20,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 22px', borderRadius: 9999,
            background: 'var(--menthe)', color: '#fff',
            fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none',
          }}
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MY PINS GRID (own profile — with delete)
   ───────────────────────────────────────────────────────────── */
function MyPinsGrid({ initialPins }: { initialPins: Pin[] }) {
  const [pins, setPins] = useState<Pin[]>(initialPins)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(pinId: string) {
    if (!window.confirm('Delete this pin? It will be removed from everywhere and cannot be undone.')) return
    setDeleting(pinId)
    try {
      const res = await fetch(`/api/pins/${pinId}`, { method: 'DELETE' })
      if (res.ok) {
        setPins(prev => prev.filter(p => p.id !== pinId))
      } else {
        alert('Failed to delete pin. Please try again.')
      }
    } catch {
      alert('Failed to delete pin. Please try again.')
    } finally {
      setDeleting(null)
    }
  }

  if (pins.length === 0) {
    return (
      <EmptyState
        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#35C8B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
        title="No pins yet"
        sub="Share your first project with the community!"
        ctaHref="/upload"
        ctaLabel="Upload a pin"
      />
    )
  }

  return (
    <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3">
      {pins.map(pin => (
        <div key={pin.id} className="mb-3 break-inside-avoid">
          <div
            className="group relative overflow-hidden rounded-2xl border border-[#E6ECEA] bg-white shadow-sm hover:shadow-md transition-shadow"
            style={{ cursor: 'default' }}
          >
            <Image
              src={pin.thumbnail_url}
              alt={pin.title || 'Project preview'}
              width={400}
              height={300}
              className="w-full h-auto object-cover"
              unoptimized
            />
            {pin.media_type === 'video' && (
              <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                VIDEO
              </span>
            )}
            {/* Remove button */}
            <button
              onClick={() => handleDelete(pin.id)}
              disabled={deleting === pin.id}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-xl px-2.5 py-1 text-xs font-semibold text-white"
              style={{
                background: deleting === pin.id ? '#f87171' : '#ef4444',
                border: 'none',
                cursor: deleting === pin.id ? 'not-allowed' : 'pointer',
              }}
            >
              {deleting === pin.id ? '…' : 'Remove'}
            </button>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-2xl" />
          </div>
          {pin.title && (
            <p className="mt-1.5 px-1 text-xs font-medium text-[#0F1720] truncate">{pin.title}</p>
          )}
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SAVED PINS TAB (lazy loaded)
   ───────────────────────────────────────────────────────────── */
function SavedPinsTab() {
  const [pins, setPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/saved-pins')
      .then(r => r.json())
      .then(data => { setPins(data.pins ?? []); setLoading(false) })
      .catch(() => { setError('Failed to load saved pins.'); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="columns-2 sm:columns-3 md:columns-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="mb-3 break-inside-avoid rounded-2xl animate-pulse"
            style={{ height: [200, 260, 180, 300, 220, 240, 200, 280][i % 8], background: '#C2F2E4', opacity: 0.5 }}
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#dc2626', fontSize: '0.875rem' }}>{error}</div>
    )
  }

  if (pins.length === 0) {
    return (
      <EmptyState
        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#35C8B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>}
        title="No saved pins yet"
        sub="Browse the feed and hit Save on pins you love."
        ctaHref="/"
        ctaLabel="Browse feed"
      />
    )
  }

  return (
    <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3">
      {pins.map(pin => (
        <div key={pin.id} className="mb-3 break-inside-avoid">
          <Link href={`/pin/${pin.id}`} scroll={false}>
            <div className="group relative overflow-hidden rounded-2xl border border-[#E6ECEA] bg-white shadow-sm hover:shadow-md transition-shadow">
              <Image
                src={pin.thumbnail_url}
                alt={pin.title || 'Project preview'}
                width={400}
                height={300}
                className="w-full h-auto object-cover"
                unoptimized
              />
              {pin.media_type === 'video' && (
                <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                  VIDEO
                </span>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-2xl" />
            </div>
            {pin.title && (
              <p className="mt-1.5 px-1 text-xs font-medium text-[#0F1720] truncate">{pin.title}</p>
            )}
          </Link>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   READ-ONLY PIN GRID (other people's profiles)
   ───────────────────────────────────────────────────────────── */
function PinGrid({ pins }: { pins: Pin[] }) {
  if (pins.length === 0) {
    return (
      <EmptyState
        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#35C8B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
        title="No pins yet"
        sub="Projects shared here will appear on this profile."
      />
    )
  }

  return (
    <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3">
      {pins.map(pin => (
        <div key={pin.id} className="mb-3 break-inside-avoid">
          <Link href={`/pin/${pin.id}`} scroll={false}>
            <div className="group relative overflow-hidden rounded-2xl border border-[#E6ECEA] bg-white shadow-sm hover:shadow-md transition-shadow">
              <Image
                src={pin.thumbnail_url}
                alt={pin.title || 'Project preview'}
                width={400}
                height={300}
                className="w-full h-auto object-cover"
                unoptimized
              />
              {pin.media_type === 'video' && (
                <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                  VIDEO
                </span>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-2xl" />
            </div>
            {pin.title && (
              <p className="mt-1.5 px-1 text-xs font-medium text-[#0F1720] truncate">{pin.title}</p>
            )}
          </Link>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   BOARDS GRID
   ───────────────────────────────────────────────────────────── */
function BoardGrid({ boards }: { boards: Board[] }) {
  if (boards.length === 0) {
    return (
      <EmptyState
        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#35C8B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>}
        title="No public boards"
        sub="Public boards created by this user will appear here."
      />
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {boards.map(board => (
        <Link key={board.id} href={`/boards/${board.id}`}>
          <div className="group rounded-2xl border border-[#E6ECEA] bg-white p-4 hover:border-[#35C8B4] hover:shadow-md transition-all">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#C2F2E4] group-hover:bg-[#35C8B4]/20 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#35C8B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-sm font-bold text-[#0F1720] truncate group-hover:text-[#35C8B4] transition-colors">
              {board.name}
            </p>
            {board.description && (
              <p className="mt-1 text-xs text-[#5B6B73] line-clamp-2">{board.description}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PROFILE TABS
   ───────────────────────────────────────────────────────────── */
export default function ProfileTabs({ pins, boards, isOwnProfile }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>(isOwnProfile ? 'my-pins' : 'pins')

  const tabs: { id: Tab; label: string; count?: number }[] = isOwnProfile
    ? [
        { id: 'my-pins',  label: 'My Pins',    count: pins.length },
        { id: 'saved',    label: 'Saved Pins' },
        { id: 'boards',   label: 'Boards',     count: boards.length },
      ]
    : [
        { id: 'pins',   label: 'Pins',   count: pins.length },
        { id: 'boards', label: 'Boards', count: boards.length },
      ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-[#E6ECEA] mb-7">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors
              ${activeTab === tab.id ? 'text-[#0F1720]' : 'text-[#5B6B73] hover:text-[#0F1720]'}`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold transition-colors
                  ${activeTab === tab.id ? 'bg-[#C2F2E4] text-[#35C8B4]' : 'bg-[#f4f4f4] text-[#5B6B73]'}`}
              >
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#35C8B4]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'my-pins' && <MyPinsGrid initialPins={pins} />}
      {activeTab === 'saved'   && <SavedPinsTab />}
      {activeTab === 'pins'    && <PinGrid pins={pins} />}
      {activeTab === 'boards'  && <BoardGrid boards={boards} />}
    </div>
  )
}
