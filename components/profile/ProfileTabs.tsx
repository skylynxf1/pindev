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
      <div style={{
        marginBottom: 16, width: 56, height: 56, borderRadius: '50%',
        background: 'var(--brume)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>{title}</p>
      <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: 0 }}>{sub}</p>
      {ctaHref && (
        <Link
          href={ctaHref}
          className="btn btn-primary"
          style={{ marginTop: 20, padding: '10px 22px', borderRadius: 9999, fontSize: '0.875rem', fontWeight: 700 }}
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PIN CARD (shared across grids)
   ───────────────────────────────────────────────────────────── */
function PinCard({ pin, children }: { pin: Pin; children?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12, breakInside: 'avoid' }}>
      <div className="pin-lift" style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 16,
        border: '1.5px solid var(--border)',
        background: 'var(--bg)',
        cursor: children ? 'default' : 'pointer',
        transition: 'border-color 150ms, transform 200ms, box-shadow 200ms',
      }}>
        <Image
          src={pin.thumbnail_url}
          alt={pin.title || 'Project preview'}
          width={400}
          height={300}
          style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block' }}
          unoptimized
        />
        {pin.media_type === 'video' && (
          <span style={{
            position: 'absolute', bottom: 8, left: 8,
            borderRadius: 9999, background: 'rgba(0,0,0,0.6)',
            padding: '3px 8px', fontSize: '0.625rem', fontWeight: 600,
            color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            Video
          </span>
        )}
        {children}
      </div>
      {pin.title && (
        <p style={{ marginTop: 6, padding: '0 4px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {pin.title}
        </p>
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
        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
        title="No pins yet"
        sub="Share your first project with the community!"
        ctaHref="/create"
        ctaLabel="Create a pin"
      />
    )
  }

  return (
    <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5" style={{ gap: 12 }}>
      {pins.map(pin => (
        <PinCard key={pin.id} pin={pin}>
          <button
            onClick={() => handleDelete(pin.id)}
            disabled={deleting === pin.id}
            className="pin-remove-btn"
            style={{
              position: 'absolute', top: 8, right: 8,
              opacity: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 4, padding: '5px 10px',
              borderRadius: 10,
              border: 'none',
              background: deleting === pin.id ? '#f87171' : '#ef4444',
              color: '#fff',
              fontSize: '0.6875rem', fontWeight: 700,
              cursor: deleting === pin.id ? 'not-allowed' : 'pointer',
              transition: 'opacity 150ms, background 150ms',
              zIndex: 2,
            }}
          >
            {deleting === pin.id ? (
              <span className="spinner" style={{ width: 10, height: 10, borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }} />
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            )}
            {deleting === pin.id ? 'Deleting' : 'Remove'}
          </button>
        </PinCard>
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
      <div className="columns-2 sm:columns-3 md:columns-4" style={{ gap: 12 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{
              marginBottom: 12, breakInside: 'avoid',
              height: [200, 260, 180, 300, 220, 240, 200, 280][i % 8],
              borderRadius: 16,
            }}
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '40px 20px', textAlign: 'center',
        borderRadius: 14, border: '1px solid #fecaca',
        background: '#fef2f2', color: '#dc2626', fontSize: '0.875rem',
      }}>
        {error}
      </div>
    )
  }

  if (pins.length === 0) {
    return (
      <EmptyState
        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>}
        title="No saved pins yet"
        sub="Browse the feed and hit Save on pins you love."
        ctaHref="/"
        ctaLabel="Browse feed"
      />
    )
  }

  return (
    <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5" style={{ gap: 12 }}>
      {pins.map(pin => (
        <Link key={pin.id} href={`/pin/${pin.id}`} scroll={false} style={{ textDecoration: 'none', color: 'inherit' }}>
          <PinCard pin={pin} />
        </Link>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   READ-ONLY PIN GRID (other people's profiles)
   ───────────────────────────────────────────────────────────── */
function ReadOnlyPinGrid({ pins }: { pins: Pin[] }) {
  if (pins.length === 0) {
    return (
      <EmptyState
        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
        title="No pins yet"
        sub="Projects shared here will appear on this profile."
      />
    )
  }

  return (
    <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5" style={{ gap: 12 }}>
      {pins.map(pin => (
        <Link key={pin.id} href={`/pin/${pin.id}`} scroll={false} style={{ textDecoration: 'none', color: 'inherit' }}>
          <PinCard pin={pin} />
        </Link>
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
        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>}
        title="No public boards"
        sub="Public boards created by this user will appear here."
      />
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
      {boards.map(board => (
        <Link key={board.id} href={`/boards/${board.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="pin-lift" style={{
            borderRadius: 16,
            border: '1.5px solid var(--border)',
            background: 'var(--bg)',
            padding: '20px 18px',
            transition: 'border-color 150ms, transform 200ms, box-shadow 200ms',
          }}>
            <div style={{
              marginBottom: 12, width: 48, height: 48,
              borderRadius: 14,
              background: 'var(--brume)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 150ms',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 0 4px' }}>
              {board.name}
            </p>
            {board.description && (
              <p style={{
                fontSize: '0.75rem', color: 'var(--muted)', margin: 0,
                lineHeight: 1.5, overflow: 'hidden',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {board.description}
              </p>
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
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        borderBottom: '1.5px solid var(--border)',
        marginBottom: 28,
      }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: active ? 700 : 600,
                color: active ? 'var(--text)' : 'var(--muted)',
                cursor: 'pointer',
                transition: 'color 150ms',
              }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span style={{
                  borderRadius: 9999,
                  padding: '2px 8px',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  background: active ? 'var(--brume)' : 'var(--surface-2)',
                  color: active ? 'var(--menthe)' : 'var(--muted)',
                  transition: 'background 150ms, color 150ms',
                }}>
                  {tab.count}
                </span>
              )}
              {active && (
                <span style={{
                  position: 'absolute', bottom: -1, left: 0, right: 0,
                  height: 2, borderRadius: 9999,
                  background: 'var(--menthe)',
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'my-pins' && <MyPinsGrid initialPins={pins} />}
      {activeTab === 'saved'   && <SavedPinsTab />}
      {activeTab === 'pins'    && <ReadOnlyPinGrid pins={pins} />}
      {activeTab === 'boards'  && <BoardGrid boards={boards} />}

      {/* Hover reveal for remove button */}
      <style>{`
        .pin-remove-btn { opacity: 0 !important; }
        .pin-lift:hover .pin-remove-btn { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
