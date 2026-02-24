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

// Row-based stagger: all pins in the same row animate together.
// Cap at 4 rows so large batches don't feel sluggish.
function rowDelay(pinIndex: number, cols: number): number {
  return Math.min(Math.floor(pinIndex / cols) * 70, 280)
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
  const gridRef    = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(4)
  const colsRef = useRef(4)

  // ── Impression tracking ───────────────────────────────────────────────────
  // When a pin enters the viewport (≥30% visible), fire an impression.
  // sessionStorage deduplication ensures we count each pin once per session.
  useEffect(() => {
    if (!gridRef.current) return
    const impressedKey = 'pindev_impressed'
    function getImpressed(): Set<string> {
      try { return new Set(JSON.parse(sessionStorage.getItem(impressedKey) ?? '[]')) }
      catch { return new Set() }
    }
    function markImpressed(id: string) {
      const s = getImpressed(); s.add(id)
      sessionStorage.setItem(impressedKey, JSON.stringify([...s]))
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const id = (entry.target as HTMLElement).dataset.pinId
          if (!id) continue
          const already = getImpressed()
          if (already.has(id)) continue
          markImpressed(id)
          observer.unobserve(entry.target)
          fetch(`/api/pins/${id}/impression`, { method: 'POST' }).catch(() => {})
        }
      },
      { threshold: 0.3 }
    )

    const items = gridRef.current.querySelectorAll<HTMLElement>('[data-pin-item]')
    items.forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [pins])

  // ── Stagger state ────────────────────────────────────────────────────────────
  // pinId → animationDelay (ms). Only pins in this map get .pin-stagger class.
  // We never set opacity:0 as an inline style — the CSS fill-mode handles it.
  // Safe fallback: if the keyframe is missing the pin stays fully visible.
  const [staggerIds, setStaggerIds] = useState<Map<string, number>>(new Map())

  // Track which pins have already been accounted for (so we never re-animate).
  const seenIds = useRef(new Set<string>())

  // True once the first non-intro batch has been marked (returning visitors).
  const firstBatchSeenRef = useRef(false)

  // ── Mark first batch as seen WITHOUT animating (returning visitor path) ─────
  // This runs before the scroll-stagger effect so seenIds is populated first.
  useEffect(() => {
    // If intro is active, let the MutationObserver handle the first batch.
    if (document.body.classList.contains('intro-active')) return
    if (firstBatchSeenRef.current || pins.length === 0) return
    firstBatchSeenRef.current = true
    pins.forEach(p => seenIds.current.add(p.id))
  }, [pins])

  // ── Detect landing animation end; stagger-reveal existing pins via DOM ──────
  // We use direct DOM manipulation so the animation starts synchronously,
  // before React's async re-render cycle, preventing any flash of invisible content.
  // React state is then synced with the same values so React won't clear our styles.
  const [introReady, setIntroReady] = useState(false)

  useEffect(() => {
    if (!document.body.classList.contains('intro-active')) {
      // Returning visitor — no intro, mark intro path as done.
      setIntroReady(true)
      return
    }

    const obs = new MutationObserver(() => {
      if (document.body.classList.contains('intro-active')) return
      obs.disconnect()
      firstBatchSeenRef.current = true // intro handled the first batch

      const items = gridRef.current?.querySelectorAll<HTMLElement>('[data-pin-item]') ?? []
      const batch = new Map<string, number>()

      items.forEach((el, i) => {
        const id = el.dataset.pinId
        const delay = rowDelay(i, colsRef.current)
        if (id) {
          seenIds.current.add(id)
          batch.set(id, delay)
        }
        // Synchronous DOM write → animation starts immediately, no flash.
        el.classList.add('pin-stagger')
        el.style.animationDelay = `${delay}ms`
      })

      // Sync React state with identical values so React reconciler
      // sees no diff and won't clear our DOM-applied styles on next render.
      setStaggerIds(batch)
      setIntroReady(true)
    })

    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // ── Stagger newly scroll-loaded pins row-by-row ───────────────────────────
  useEffect(() => {
    if (!introReady) return
    const newPins = pins.filter(p => !seenIds.current.has(p.id))
    if (newPins.length === 0) return

    setStaggerIds(prev => {
      const next = new Map(prev)
      newPins.forEach((pin, i) => {
        next.set(pin.id, rowDelay(i, colsRef.current))
        seenIds.current.add(pin.id)
      })
      return next
    })
  }, [pins, introReady])

  // ── Responsive columns ────────────────────────────────────────────────────
  const hasMoreRef    = useRef(hasMore)
  const loadingRef    = useRef(loading)
  const onLoadMoreRef = useRef(onLoadMore)
  useEffect(() => { hasMoreRef.current    = hasMore   }, [hasMore])
  useEffect(() => { loadingRef.current    = loading   }, [loading])
  useEffect(() => { onLoadMoreRef.current = onLoadMore }, [onLoadMore])

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      let c = 4
      if (w < 640)  c = 1
      else if (w < 900)  c = 2
      else if (w < 1200) c = 3
      else if (w < 1500) c = 4
      else if (w < 1800) c = 5
      else c = 6
      setCols(c)
      colsRef.current = c
      onColsChange?.(c)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Layout helpers ────────────────────────────────────────────────────────
  const SPACING  = [14, 18, 16, 20, 14, 16, 18, 14]
  const gridStyle: React.CSSProperties = { columns: cols, columnGap: 16 }
  const getItemStyle = (i: number): React.CSSProperties => ({
    marginBottom: SPACING[i % SPACING.length],
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
  })

  // ── Empty state ───────────────────────────────────────────────────────────
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
    <div ref={gridRef}>
      <div style={gridStyle}>
        {pins.map((pin, i) => {
          const delay = staggerIds.get(pin.id)
          return (
            <div
              key={pin.id}
              data-pin-item
              data-pin-id={pin.id}
              // Only add .pin-stagger when this pin is in the stagger queue.
              // NO inline opacity:0 — fill-mode:both handles start state via CSS.
              // If keyframe is missing the pin simply stays visible (safe fallback).
              className={delay !== undefined ? 'pin-stagger' : undefined}
              style={{
                ...getItemStyle(i),
                ...(delay !== undefined ? { animationDelay: `${delay}ms` } : {}),
              }}
            >
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
          )
        })}
      </div>

      {/* Sentinel for IntersectionObserver */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* Loading skeletons — reduced to cols*3 rows for smoother incremental loads */}
      {loading && (
        <div style={{ ...gridStyle, marginTop: 16 }}>
          {Array.from({ length: cols * 3 }).map((_, i) => (
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

      {/* End of feed */}
      {!hasMore && !loading && pins.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          margin: '32px 0 16px', color: 'var(--muted)',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span
            onClick={onEmptyClick}
            style={{
              fontSize: '0.8125rem', fontWeight: 600,
              color: 'var(--menthe)', cursor: 'pointer', whiteSpace: 'nowrap',
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
