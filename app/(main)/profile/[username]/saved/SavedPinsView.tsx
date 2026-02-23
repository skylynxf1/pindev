'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Pin } from '@/types'

/* ─────────────────────────────────────────────────────────────
   PIN ITEM
   ───────────────────────────────────────────────────────────── */
function PinItem({
  pin,
  isOwner,
  removing,
  onRemove,
}: {
  pin: Pin
  isOwner: boolean
  removing: boolean
  onRemove: () => void
}) {
  const router = useRouter()
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{ marginBottom: 12, breakInside: 'avoid' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        role="link"
        tabIndex={0}
        onClick={() => router.push(`/pin/${pin.id}`)}
        onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/pin/${pin.id}`) }}
        style={{
          position: 'relative', overflow: 'hidden', cursor: 'pointer',
          borderRadius: 16, border: '1.5px solid var(--border)',
          background: 'var(--bg)',
          transition: 'border-color 150ms, transform 200ms, box-shadow 200ms',
          transform: hovered ? 'translateY(-3px)' : 'none',
          boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
          <Image
            src={pin.thumbnail_url}
            alt={pin.title || 'Pin'}
            width={400}
            height={300}
            style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block' }}
            unoptimized
          />

          {/* Remove button — owner only */}
          {isOwner && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove() }}
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
          )}

          {/* Live link */}
          {pin.live_url && (
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
          )}
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
   SAVED PINS VIEW
   ───────────────────────────────────────────────────────────── */
interface SavedPinsViewProps {
  pins: Pin[]
  username: string
  displayName: string
  isOwner: boolean
  boardId: string | null
}

export default function SavedPinsView({
  pins: initialPins,
  username,
  displayName,
  isOwner,
  boardId,
}: SavedPinsViewProps) {
  const [pins, setPins] = useState<Pin[]>(initialPins)
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleRemove(pinId: string) {
    if (!boardId) return
    setRemoving(pinId)
    try {
      const res = await fetch('/api/board-pins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board_id: boardId, pin_id: pinId }),
      })
      if (res.ok) {
        setPins(prev => prev.filter(p => p.id !== pinId))
      }
    } finally {
      setRemoving(null)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1800, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Back button */}
        <Link
          href={`/profile/${username}?tab=boards`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginBottom: 24, padding: '8px 16px', borderRadius: 12,
            border: '1.5px solid var(--border)', background: 'var(--bg)',
            fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)',
            textDecoration: 'none',
            transition: 'color 150ms, border-color 150ms, background 150ms',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to {isOwner ? 'boards' : `${displayName}'s profile`}
        </Link>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, background: 'var(--brume)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              {isOwner ? 'Saved' : `${displayName}'s Saved`}
            </h1>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 600 }}>
              {pins.length === 0 ? 'No pins' : `${pins.length} ${pins.length === 1 ? 'pin' : 'pins'}`}
            </p>
          </div>
        </div>

        {/* Empty state */}
        {pins.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '80px 20px', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: 'var(--brume)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
              {isOwner ? 'No saved pins yet' : `${displayName} hasn't saved any pins yet`}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 20px' }}>
              {isOwner ? 'Go to the feed and hit Save on any pin' : 'Check back later!'}
            </p>
            {isOwner && (
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
            )}
          </div>
        )}

        {/* Pins grid */}
        {pins.length > 0 && (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5" style={{ gap: 12 }}>
            {pins.map(pin => (
              <PinItem
                key={pin.id}
                pin={pin}
                isOwner={isOwner}
                removing={removing === pin.id}
                onRemove={() => handleRemove(pin.id)}
              />
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </main>
  )
}
