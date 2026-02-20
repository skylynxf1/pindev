'use client'

import { useEffect, useRef, useState } from 'react'
import PinCard from './PinCard'
import type { Pin } from '@/types'

interface MasonryGridProps {
  pins: Pin[]
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  onSave?: (pin: Pin) => void
  onEmptyClick?: () => void
  currentUserId?: string
  onDelete?: (id: string) => void
  emptyText?: string
  emptySubtext?: string
}

const PLACEHOLDER_HEIGHTS = [280, 360, 220, 400, 300, 340, 240, 380, 260, 320, 290, 440]

function PlaceholderCard({ height, first, onClick, emptyText, emptySubtext }: { height: number; first: boolean; onClick?: () => void; emptyText?: string; emptySubtext?: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={first ? onClick : undefined}
      style={{
        marginBottom: 16,
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        height,
        borderRadius: 18,
        background: hovered
          ? 'linear-gradient(135deg, var(--menthe-light) 0%, var(--brume) 100%)'
          : 'var(--surface)',
        border: '1.5px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 200ms ease, box-shadow 200ms ease, background 200ms ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.10)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {first && (
        <div style={{ textAlign: 'center', padding: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--menthe-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, margin: '0 0 5px' }}>
            {emptyText ?? 'no genius here yet...'}
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--menthe)', fontWeight: 600, margin: 0 }}>
            {emptySubtext ?? 'add yours!'}
          </p>
        </div>
      )}
    </div>
  )
}

export default function MasonryGrid({
  pins,
  hasMore,
  loading,
  onLoadMore,
  onSave,
  onEmptyClick,
  currentUserId,
  onDelete,
  emptyText,
  emptySubtext,
}: MasonryGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(4)

  // JS-driven column count — avoids Tailwind v4 responsive class issues
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w < 640) setCols(1)
      else if (w < 900) setCols(2)
      else if (w < 1200) setCols(3)
      else if (w < 1500) setCols(4)
      else setCols(5)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // IntersectionObserver drives infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) onLoadMore()
      },
      { rootMargin: '400px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, onLoadMore])

  const gridStyle: React.CSSProperties = { columns: cols, columnGap: 16 }
  const itemStyle: React.CSSProperties = { marginBottom: 16, breakInside: 'avoid', pageBreakInside: 'avoid' }

  // Empty state — show placeholder cards so the masonry layout is never blank
  if (!loading && pins.length === 0) {
    return (
      <div style={gridStyle}>
        {PLACEHOLDER_HEIGHTS.map((h, i) => (
          <PlaceholderCard key={i} height={h} first={i === 0} onClick={onEmptyClick} emptyText={emptyText} emptySubtext={emptySubtext} />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Single grid — real pins + CTA placeholders flow together */}
      <div style={gridStyle}>
        {pins.map((pin) => (
          <div key={pin.id} style={itemStyle}>
            <PinCard pin={pin} onSave={onSave} currentUserId={currentUserId} onDelete={onDelete} />
          </div>
        ))}

        {!hasMore && pins.length > 0 && (
          PLACEHOLDER_HEIGHTS.slice(0, cols * 2).map((h, i) => (
            <PlaceholderCard key={`end-${i}`} height={h} first={i === 0} onClick={onEmptyClick} emptyText={emptyText} emptySubtext={emptySubtext} />
          ))
        )}
      </div>

      {/* Sentinel for IntersectionObserver */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* Loading skeletons */}
      {loading && (
        <div style={{ ...gridStyle, marginTop: 16 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              style={{
                ...itemStyle,
                height: PLACEHOLDER_HEIGHTS[i % PLACEHOLDER_HEIGHTS.length],
                borderRadius: 18,
                background: 'var(--menthe-light)',
                opacity: 0.45,
              }}
              className="animate-pulse"
            />
          ))}
        </div>
      )}
    </div>
  )
}
