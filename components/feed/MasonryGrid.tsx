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
  isAdmin?: boolean
  allSaved?: boolean
  savedPinIds?: Set<string>
  emptyText?: string
  emptySubtext?: string
  onColsChange?: (cols: number) => void
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
  isAdmin,
  allSaved,
  savedPinIds,
  emptyText,
  emptySubtext,
  onColsChange,
}: MasonryGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(4)

  // Keep refs in sync so the observer callback always reads the latest values
  // without needing to be torn down and re-created on every state change.
  const hasMoreRef = useRef(hasMore)
  const loadingRef = useRef(loading)
  const onLoadMoreRef = useRef(onLoadMore)
  useEffect(() => { hasMoreRef.current = hasMore }, [hasMore])
  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { onLoadMoreRef.current = onLoadMore }, [onLoadMore])

  // JS-driven column count — avoids Tailwind v4 responsive class issues
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      let c = 4
      if (w < 640) c = 1
      else if (w < 900) c = 2
      else if (w < 1200) c = 3
      else if (w < 1500) c = 4
      else c = 5
      setCols(c)
      onColsChange?.(c)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Stable IntersectionObserver — only mounts/unmounts with the component.
  // Reads hasMore/loading/onLoadMore via refs so it never needs to reconnect,
  // eliminating the "stuck scroll" caused by observer gaps during re-attachment.
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

  // Re-check sentinel whenever loading finishes — covers the case where the
  // sentinel was already in view while loading, so no new intersection fires.
  useEffect(() => {
    if (!loading) tryLoad()
  }, [loading, tryLoad])

  const gridStyle: React.CSSProperties = { columns: cols, columnGap: 16 }
  const itemStyle: React.CSSProperties = { marginBottom: 16, breakInside: 'avoid', pageBreakInside: 'avoid' }

  // Empty state
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
      <div style={gridStyle}>
        {pins.map((pin) => (
          <div key={pin.id} data-pin-item style={itemStyle}>
            <PinCard
              pin={pin}
              onSave={onSave}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onUnsave={onUnsave}
              onEdit={onEdit}
              onAdminDelete={onAdminDelete}
              isAdmin={isAdmin}
              initialSaved={allSaved ?? savedPinIds?.has(pin.id)}
            />
          </div>
        ))}

        {/* End-of-feed placeholders — flow into shortest columns so they appear at the bottom */}
        {!hasMore && pins.length > 0 && PLACEHOLDER_HEIGHTS.slice(0, cols).map((h, i) => (
          <PlaceholderCard
            key={`end-${i}`}
            height={h}
            first={i === 0}
            onClick={onEmptyClick}
            emptyText={emptyText}
            emptySubtext={emptySubtext}
          />
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
