'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Pin, Board } from '@/types'

/* ─────────────────────────────────────────────────────────────
   PIN GRID WITH REMOVE BUTTON
   ───────────────────────────────────────────────────────────── */
function BoardPinGrid({
  pins,
  boardId,
  onRemove,
}: {
  pins: Pin[]
  boardId: string
  onRemove: (pinId: string) => void
}) {
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleRemove(pinId: string) {
    setRemoving(pinId)
    try {
      const res = await fetch('/api/board-pins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board_id: boardId, pin_id: pinId }),
      })
      if (res.ok) onRemove(pinId)
    } finally {
      setRemoving(null)
    }
  }

  if (pins.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 20px', textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: 'var(--brume)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>This board is empty</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 20px' }}>
          Go to the feed and hit Save on any pin →
        </p>
        <Link
          href="/"
          style={{
            padding: '10px 22px', borderRadius: 9999,
            background: 'var(--menthe)', color: '#fff',
            fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none',
          }}
        >
          Browse feed
        </Link>
      </div>
    )
  }

  return (
    <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5" style={{ gap: 12 }}>
      {pins.map(pin => (
        <PinItem
          key={pin.id}
          pin={pin}
          removing={removing === pin.id}
          onRemove={() => handleRemove(pin.id)}
        />
      ))}
    </div>
  )
}

function PinItem({
  pin,
  removing,
  onRemove,
}: {
  pin: Pin
  removing: boolean
  onRemove: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{ marginBottom: 12, breakInside: 'avoid' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 16, border: '1.5px solid var(--border)',
        background: 'var(--bg)',
        transition: 'border-color 150ms, transform 200ms, box-shadow 200ms',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <Image
          src={pin.thumbnail_url}
          alt={pin.title || 'Pin'}
          width={400}
          height={300}
          style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block' }}
          unoptimized
        />

        {/* Remove button */}
        <button
          onClick={onRemove}
          disabled={removing}
          style={{
            position: 'absolute', top: 8, right: 8,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 10,
            border: 'none',
            background: removing ? '#f87171' : '#ef4444',
            color: '#fff',
            fontSize: '0.6875rem', fontWeight: 700,
            cursor: removing ? 'not-allowed' : 'pointer',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 150ms, background 150ms',
            zIndex: 2,
          }}
        >
          {removing ? (
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.4)',
              borderTopColor: '#fff',
              animation: 'spin .7s linear infinite',
              display: 'inline-block',
            }} />
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          )}
          {removing ? 'Removing' : 'Remove'}
        </button>

        {/* Live link */}
        <a
          href={pin.live_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'absolute', bottom: 8, left: 8,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 8,
            background: 'rgba(0,0,0,0.55)',
            color: '#fff', fontSize: '0.6875rem', fontWeight: 600,
            textDecoration: 'none',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 150ms',
          }}
          onClick={e => e.stopPropagation()}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Live
        </a>
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
   BOARD PAGE
   ───────────────────────────────────────────────────────────── */
export default function BoardPage() {
  const params = useParams()
  const router = useRouter()
  const boardId = params.id as string

  const [board, setBoard] = useState<Board | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [ownerUsername, setOwnerUsername] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function load() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()

      const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('id, owner_id, name, description, is_private, created_at, updated_at')
        .eq('id', boardId)
        .single()

      if (boardError || !boardData) {
        setError('Board not found.')
        setLoading(false)
        return
      }

      setBoard(boardData as Board)
      setEditName(boardData.name)
      setIsOwner(!!user && user.id === boardData.owner_id)

      // Fetch owner's username for back navigation
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', boardData.owner_id)
        .single()
      setOwnerUsername(profileData?.username ?? null)

      const { data: boardPinsData, error: pinsError } = await supabase
        .from('board_pins')
        .select(`
          saved_at,
          pins (
            id, owner_id, title, description, live_url, repo_url,
            media_url, media_type, thumbnail_url, is_published,
            created_at, updated_at,
            profiles ( username, display_name, avatar_url ),
            pin_tags ( tags ( id, name ) )
          )
        `)
        .eq('board_id', boardId)
        .order('saved_at', { ascending: false })

      if (pinsError) {
        setError('Failed to load pins.')
        setLoading(false)
        return
      }

      const mapped: Pin[] = (boardPinsData ?? [])
        .map((bp: Record<string, unknown>) => {
          const p = bp.pins as Record<string, unknown> | null
          if (!p) return null
          return {
            id: p.id as string,
            owner_id: p.owner_id as string,
            title: p.title as string,
            description: p.description as string,
            live_url: p.live_url as string,
            repo_url: p.repo_url as string | null,
            media_url: p.media_url as string,
            media_type: p.media_type as 'image' | 'video',
            thumbnail_url: p.thumbnail_url as string,
            is_published: p.is_published as boolean,
            created_at: p.created_at as string,
            updated_at: p.updated_at as string,
            profile: Array.isArray(p.profiles) ? (p.profiles[0] ?? null) : (p.profiles as Pin['profile'] ?? null),
            tags: Array.isArray(p.pin_tags)
              ? (p.pin_tags as Array<{ tags: { id: string; name: string } }>).map(pt => pt.tags).filter(Boolean)
              : [],
          } as Pin
        })
        .filter(Boolean) as Pin[]

      setPins(mapped)
      setLoading(false)
    }

    load()
  }, [boardId])

  function goToBoards() {
    if (ownerUsername) {
      router.push(`/profile/${ownerUsername}?tab=boards`)
    } else {
      router.back()
    }
  }

  async function handleEditSave() {
    const name = editName.trim()
    if (!name || editSaving) return
    setEditSaving(true)
    setEditError('')
    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (res.ok) {
        setBoard(prev => prev ? { ...prev, name: data.board.name } : prev)
        setEditError('')
        setEditing(false)
      } else {
        setEditError(data.error ?? 'Failed to update board.')
      }
    } catch {
      setEditError('Something went wrong.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/boards/${boardId}`, { method: 'DELETE' })
      if (res.ok) {
        goToBoards()
      } else {
        setDeleteError('Failed to delete board. Please try again.')
        setDeleting(false)
        setConfirmDelete(false)
      }
    } catch {
      setDeleteError('Something went wrong. Please try again.')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (!loading && error) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{error}</p>
          <button type="button" onClick={goToBoards} style={{ padding: '9px 20px', borderRadius: 12, border: 'none', background: 'var(--menthe)', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>
            Go back
          </button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1800, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Back button */}
        <button
          type="button"
          onClick={goToBoards}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginBottom: 24, padding: '8px 16px', borderRadius: 12,
            border: '1.5px solid var(--border)', background: 'var(--bg)',
            fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)',
            cursor: 'pointer', transition: 'color 150ms, border-color 150ms, background 150ms',
          }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = 'var(--menthe)'; el.style.borderColor = 'var(--menthe)'; el.style.background = 'var(--brume)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = 'var(--muted)'; el.style.borderColor = 'var(--border)'; el.style.background = 'var(--bg)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>

        {/* ── Board header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, background: 'var(--brume)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              /* ── Inline edit form ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') { setEditing(false); setEditName(board?.name ?? '') } }}
                  maxLength={80}
                  style={{
                    fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)',
                    border: 'none', borderBottom: '2px solid var(--menthe)',
                    background: 'transparent', outline: 'none', padding: '2px 0',
                    width: '100%',
                  }}
                />
                {editError && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--danger)' }}>{editError}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleEditSave}
                    disabled={editSaving || !editName.trim()}
                    style={{
                      padding: '7px 16px', borderRadius: 10, border: 'none',
                      background: editSaving || !editName.trim() ? 'var(--brume)' : 'var(--menthe)',
                      color: editSaving || !editName.trim() ? 'var(--muted)' : '#fff',
                      fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {editSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setEditName(board?.name ?? '') }}
                    style={{
                      padding: '7px 16px', borderRadius: 10,
                      border: '1.5px solid var(--border)', background: 'transparent',
                      fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                {board?.name ?? '…'}
              </h1>
            )}
            {!editing && board?.description && (
              <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--muted)' }}>{board.description}</p>
            )}
            {!loading && !editing && (
              <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 600 }}>
                {pins.length === 0 ? 'No pins' : `${pins.length} ${pins.length === 1 ? 'pin' : 'pins'}`}
              </p>
            )}
          </div>

          {/* ── Edit / Delete actions — owner only ── */}
          {!loading && !editing && isOwner && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {/* Edit */}
              <button
                type="button"
                onClick={() => { setEditing(true); setConfirmDelete(false) }}
                title="Rename board"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 12,
                  border: '1.5px solid var(--border)', background: 'var(--bg)',
                  fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)',
                  cursor: 'pointer', transition: 'border-color 150ms, color 150ms',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'var(--menthe)'; el.style.color = 'var(--menthe)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--muted)' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Rename
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 12,
                  border: `1.5px solid ${confirmDelete ? '#ef4444' : 'var(--border)'}`,
                  background: confirmDelete ? '#fef2f2' : 'var(--bg)',
                  fontSize: '0.8125rem', fontWeight: 600,
                  color: confirmDelete ? '#ef4444' : 'var(--muted)',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  transition: 'border-color 150ms, color 150ms, background 150ms',
                }}
                onMouseEnter={e => { if (!confirmDelete) { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = '#ef4444'; el.style.color = '#ef4444' } }}
                onMouseLeave={e => { if (!confirmDelete) { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--muted)' } }}
              >
                {deleting ? (
                  <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(239,68,68,0.4)', borderTopColor: '#ef4444', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                )}
                {deleting ? 'Deleting…' : confirmDelete ? 'Confirm delete?' : 'Delete'}
              </button>
            </div>
          )}
        </div>

        {/* Delete error */}
        {deleteError && (
          <p style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 12, border: '1px solid #fca5a5', background: '#fef2f2', fontSize: '0.875rem', color: '#dc2626' }}>
            {deleteError}
          </p>
        )}

        {/* ── Pins grid ── */}
        {loading ? (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5" style={{ gap: 12 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse" style={{
                marginBottom: 12, breakInside: 'avoid',
                height: [200, 260, 180, 300, 220, 240, 200, 280, 220, 260][i % 10],
                borderRadius: 16, background: 'var(--brume)', opacity: 0.5,
              }} />
            ))}
          </div>
        ) : (
          <BoardPinGrid
            pins={pins}
            boardId={boardId}
            onRemove={id => setPins(prev => prev.filter(p => p.id !== id))}
          />
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </main>
  )
}
