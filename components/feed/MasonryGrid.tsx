'use client'

import { useEffect, useRef } from 'react'
import PinCard from './PinCard'
import type { Pin } from '@/types'

interface MasonryGridProps {
  pins: Pin[]
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  onSave: (pin: Pin) => void
}

export default function MasonryGrid({
  pins,
  hasMore,
  loading,
  onLoadMore,
  onSave,
}: MasonryGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  // IntersectionObserver drives infinite scroll — no scroll event listeners needed
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore()
        }
      },
      { rootMargin: '400px' } // start fetching 400px before the user hits the bottom
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, onLoadMore])

  if (!loading && pins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#C2F2E4]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#35C8B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-[#0F1720]">No projects yet</p>
        <p className="mt-1 text-sm text-[#5B6B73]">Be the first to share something.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/*
        CSS columns masonry — widest browser support.
        Tailwind's responsive column-count classes handle breakpoints.
      */}
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
        {pins.map((pin) => (
          <div key={pin.id} className="mb-4 break-inside-avoid">
            <PinCard pin={pin} onSave={onSave} />
          </div>
        ))}
      </div>

      {/* Sentinel element for IntersectionObserver */}
      <div ref={sentinelRef} className="h-px" />

      {/* Loading skeletons */}
      {loading && (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 mt-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="mb-4 break-inside-avoid rounded-2xl bg-[#C2F2E4]/40 animate-pulse"
              style={{ height: `${180 + (i % 4) * 60}px` }}
            />
          ))}
        </div>
      )}

      {/* End of feed */}
      {!hasMore && pins.length > 0 && (
        <p className="py-12 text-center text-sm text-[#5B6B73]">
          You've seen everything ✦
        </p>
      )}
    </div>
  )
}
