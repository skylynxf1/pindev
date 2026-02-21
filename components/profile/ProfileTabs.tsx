'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Pin, Board } from '@/types'

/* ─────────────────────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────────────────────── */
type OwnTab = 'my-pins' | 'boards'
type OtherTab = 'pins' | 'boards'
type Tab = OwnTab | OtherTab

interface ProfileTabsProps {
  pins: Pin[]
  boards: Board[]
  isOwnProfile: boolean
  initialTab?: 'boards'
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
/* ── shared card shell ── */
const BOARD_CARD_STYLE: React.CSSProperties = {
  borderRadius: 16,
  border: '1.5px solid var(--border)',
  background: 'var(--bg)',
  padding: '20px 18px',
  transition: 'border-color 150ms, transform 200ms, box-shadow 200ms',
  height: '100%',
}

function BoardGrid({ boards, onBoardAdded, isOwnProfile }: { boards: Board[]; onBoardAdded: (b: Board) => void; isOwnProfile: boolean }) {
  const [showCreate, setShowCreate] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  async function handleCreate() {
    const name = newBoardName.trim()
    if (!name || creating) return
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (res.ok) {
        onBoardAdded(data.board)
        setNewBoardName('')
        setShowCreate(false)
      } else {
        setCreateError(data.error ?? 'Failed to create board.')
      }
    } catch {
      setCreateError('Something went wrong.')
    } finally {
      setCreating(false)
    }
  }

  function cancelCreate() {
    setShowCreate(false)
    setNewBoardName('')
    setCreateError('')
  }

  if (boards.length === 0 && !isOwnProfile) {
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

      {/* Board cards */}
      {boards.map(board => {
        const isSaved = board.name === 'Saved'
        const href = isSaved ? '/saved' : `/boards/${board.id}`
        return (
          <Link key={board.id} href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="pin-lift" style={BOARD_CARD_STYLE}>
              <div style={{
                marginBottom: 12, width: 48, height: 48,
                borderRadius: 14,
                background: 'var(--brume)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isSaved ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                )}
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
        )
      })}

      {/* New Board — own profile only */}
      {isOwnProfile && (
        showCreate ? (
          /* ── Inline create form ── */
          <div style={{
            ...BOARD_CARD_STYLE,
            border: '1.5px solid var(--menthe)',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{
              marginBottom: 4, width: 48, height: 48, borderRadius: 14,
              background: 'var(--brume)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <input
              autoFocus
              value={newBoardName}
              onChange={e => setNewBoardName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') cancelCreate() }}
              placeholder="Board name…"
              maxLength={80}
              style={{
                width: '100%', padding: '7px 10px',
                borderRadius: 8, border: '1.5px solid var(--border)',
                fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)',
                background: 'var(--surface)', outline: 'none',
                transition: 'border-color 150ms',
              }}
              onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--menthe)' }}
              onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border)' }}
            />
            {createError && (
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--danger)' }}>{createError}</p>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={handleCreate}
                disabled={creating || !newBoardName.trim()}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
                  background: creating || !newBoardName.trim() ? 'var(--brume)' : 'var(--menthe)',
                  color: creating || !newBoardName.trim() ? 'var(--muted)' : '#fff',
                  fontSize: '0.8125rem', fontWeight: 700,
                  cursor: creating || !newBoardName.trim() ? 'default' : 'pointer',
                  transition: 'background 150ms, color 150ms',
                }}
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                onClick={cancelCreate}
                style={{
                  padding: '7px 12px', borderRadius: 8,
                  border: '1.5px solid var(--border)', background: 'transparent',
                  fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)',
                  cursor: 'pointer', transition: 'border-color 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--menthe)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ── New Board button ── */
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            style={{
              ...BOARD_CARD_STYLE,
              border: '1.5px dashed var(--border)',
              background: 'transparent',
              display: 'flex', flexDirection: 'column',
              cursor: 'pointer', textAlign: 'left',
              width: '100%',
              transition: 'border-color 150ms, background 150ms, transform 200ms, box-shadow 200ms',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.borderColor = 'var(--menthe)'
              el.style.background = 'var(--brume)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.borderColor = 'var(--border)'
              el.style.background = 'transparent'
            }}
          >
            <div style={{
              marginBottom: 12, width: 48, height: 48, borderRadius: 14,
              background: 'var(--brume)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 150ms',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--menthe)', margin: '0 0 4px' }}>
              New Board
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
              Create a collection
            </p>
          </button>
        )
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PROFILE TABS
   ───────────────────────────────────────────────────────────── */
export default function ProfileTabs({ pins, boards, isOwnProfile, initialTab }: ProfileTabsProps) {
  const defaultTab: Tab = initialTab ?? (isOwnProfile ? 'my-pins' : 'pins')
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab)
  const [boardList, setBoardList] = useState<Board[]>(boards)

  const tabs: { id: Tab; label: string; count?: number }[] = isOwnProfile
    ? [
        { id: 'my-pins', label: 'My Pins',  count: pins.length },
        { id: 'boards',  label: 'Boards',   count: boardList.length },
      ]
    : [
        { id: 'pins',   label: 'Pins',   count: pins.length },
        { id: 'boards', label: 'Boards', count: boardList.length },
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
      {activeTab === 'pins'    && <ReadOnlyPinGrid pins={pins} />}
      {activeTab === 'boards'  && <BoardGrid boards={boardList} onBoardAdded={b => setBoardList(prev => [...prev, b])} isOwnProfile={isOwnProfile} />}

      {/* Hover reveal for remove button */}
      <style>{`
        .pin-remove-btn { opacity: 0 !important; }
        .pin-lift:hover .pin-remove-btn { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
