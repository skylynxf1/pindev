'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import PinCard from './PinCard'
import { PlaceholderCard, PLACEHOLDER_HEIGHTS } from './PlaceholderCard'
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
  onUnsave?: (id: string) => void
  onEdit?: (updated: Pin) => void
  onAdminDelete?: (id: string) => void
  onFeatureToggle?: (id: string, featuredUntil: string | null) => void
  isAdmin?: boolean
  allSaved?: boolean
  savedPinIds?: Set<string>
  emptyText?: string
  emptySubtext?: string
  onColsChange?: (cols: number) => void
  likesMap?: Record<string, { likeCount: number; likedByMe: boolean }>
  onAuthRequired?: () => void
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
  onUnsave,
  onEdit,
  onAdminDelete,
  onFeatureToggle,
  isAdmin,
  allSaved,
  savedPinIds,
  emptyText,
  emptySubtext,
  onColsChange,
  likesMap,
  onAuthRequired,
}: MasonryGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(4)

  const hasMoreRef = useRef(hasMore)
  const loadingRef = useRef(loading)
  const onLoadMoreRef = useRef(onLoadMore)
  useEffect(() => { hasMoreRef.current = hasMore }, [hasMore])
  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { onLoadMoreRef.current = onLoadMore }, [onLoadMore])

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      let c = 4
      if (w < 640) c = 1
      else if (w < 900) c = 2
      else if (w < 1200) c = 3
      else if (w < 1500) c = 4
      else if (w < 1800) c = 5
      else c = 6
      setCols(c)
      onColsChange?.(c)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const tryLoad = useCallback(() => {
    if (hasMoreRef.current && !loadingRef.current) onLoadMoreRef.current()
  }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) tryLoad() },
      { rootMargin: '600px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [tryLoad])

  useEffect(() => {
    if (!loading) tryLoad()
  }, [loading, tryLoad])

  // Subtle spacing pattern — alternates between 14/18/16px for organic rhythm
  const SPACING = [14, 18, 16, 20, 14, 16, 18, 14]
  const gridStyle: React.CSSProperties = { columns: cols, columnGap: 16 }
  const getItemStyle = (i: number): React.CSSProperties => ({
    marginBottom: SPACING[i % SPACING.length],
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
  })

  // Empty state — blank placeholders first, "add yours" card last
  if (!loading && pins.length === 0) {
    const lastIdx = PLACEHOLDER_HEIGHTS.length - 1
    return (
      <div style={gridStyle}>
        {PLACEHOLDER_HEIGHTS.map((h, i) => (
          <PlaceholderCard
            key={i}
            height={h}
            first={i === lastIdx}
            onClick={onEmptyClick}
            emptyText={emptyText}
            emptySubtext={emptySubtext}
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div style={gridStyle}>
        {pins.map((pin, i) => (
          <div key={pin.id} data-pin-item style={getItemStyle(i)}>
            <PinCard
              pin={pin}
              onSave={onSave}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onUnsave={onUnsave}
              onEdit={onEdit}
              onAdminDelete={onAdminDelete}
              onFeatureToggle={onFeatureToggle}
              isAdmin={isAdmin}
              initialSaved={allSaved ?? savedPinIds?.has(pin.id)}
              initialLikeCount={likesMap?.[pin.id]?.likeCount}
              initialLikedByMe={likesMap?.[pin.id]?.likedByMe}
              onAuthRequired={onAuthRequired}
            />
          </div>
        ))}
      </div>

      {/* Sentinel for IntersectionObserver */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* Loading skeletons */}
      {loading && (
        <div style={{ ...gridStyle, marginTop: 16 }}>
          {Array.from({ length: cols * 7 }).map((_, i) => (
            <div
              key={i}
              style={{
                ...getItemStyle(i),
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

      {/* End of feed — simple marker, no placeholder cards that break the column layout */}
      {!hasMore && !loading && pins.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          margin: '32px 0 16px',
          color: 'var(--muted)',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span
            onClick={onEmptyClick}
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--menthe)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}
          >
            + add yours
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
      )}
    </div>
  )
}
