'use client'

import { useState } from 'react'
import Link from 'next/link'
import PinCard from '@/components/feed/PinCard'
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
  currentUserId?: string
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
   PROFILE PIN GRID (uses the same flip-card PinCard as main feed)
   ───────────────────────────────────────────────────────────── */
function ProfilePinGrid({ initialPins, currentUserId, isOwnProfile }: { initialPins: Pin[]; currentUserId?: string; isOwnProfile: boolean }) {
  const [pins, setPins] = useState<Pin[]>(initialPins)

  function handleDelete(id: string) {
    setPins(prev => prev.filter(p => p.id !== id))
  }

  function handleEdit(updated: Pin) {
    setPins(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
  }

  if (pins.length === 0) {
    return (
      <EmptyState
        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
        title="No pins yet"
        sub={isOwnProfile ? 'Share your first project with the community!' : 'Projects shared here will appear on this profile.'}
        ctaHref={isOwnProfile ? '/create' : undefined}
        ctaLabel={isOwnProfile ? 'Create a pin' : undefined}
      />
    )
  }

  return (
    <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5" style={{ gap: 12 }}>
      {pins.map(pin => (
        <div key={pin.id} style={{ marginBottom: 16, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <PinCard
            pin={pin}
            currentUserId={currentUserId}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        </div>
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
export default function ProfileTabs({ pins, boards, isOwnProfile, initialTab, currentUserId }: ProfileTabsProps) {
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
      {(activeTab === 'my-pins' || activeTab === 'pins') && (
        <ProfilePinGrid initialPins={pins} currentUserId={currentUserId} isOwnProfile={isOwnProfile} />
      )}
      {activeTab === 'boards'  && <BoardGrid boards={boardList} onBoardAdded={b => setBoardList(prev => [...prev, b])} isOwnProfile={isOwnProfile} />}
    </div>
  )
}
