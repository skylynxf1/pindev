'use client'

import { useState, useCallback } from 'react'
import MasonryGrid from '@/components/feed/MasonryGrid'
import TagPills from '@/components/pin/TagPills'
import BoardPickerModal from '@/components/boards/BoardPickerModal'
import { usePins } from '@/lib/hooks/usePins'
import type { Pin, Tag } from '@/types'

interface HomeFeedProps {
  initialPins: Pin[]
  popularTags: (Tag & { count: number })[]
}

export default function HomeFeed({ initialPins, popularTags }: HomeFeedProps) {
  const { pins, loading, hasMore, error, fetchNextPage } = usePins({ initialPins })
  const [pinToSave, setPinToSave] = useState<Pin | null>(null)

  const handleSave = useCallback((pin: Pin) => {
    setPinToSave(pin)
  }, [])

  return (
    <>
      {/* Popular tags */}
      {popularTags.length > 0 && (
        <div className="mb-6">
          <TagPills
            tags={popularTags}
            navigable
            showCount
            size="md"
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="mb-6 rounded-2xl border px-4 py-3 text-sm"
          style={{
            background: 'var(--danger-bg)',
            borderColor: 'var(--danger)',
            color: 'var(--danger)',
          }}
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && pins.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'var(--menthe-light)' }}
          >
            <svg
              width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="var(--menthe)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            No pins yet
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            Be the first to share a project.
          </p>
        </div>
      )}

      {/* Masonry grid */}
      {pins.length > 0 && (
        <MasonryGrid
          pins={pins}
          hasMore={hasMore}
          loading={loading}
          onLoadMore={fetchNextPage}
          onSave={handleSave}
        />
      )}

      {/* Board picker modal */}
      {pinToSave && (
        <BoardPickerModal
          pin={pinToSave}
          onClose={() => setPinToSave(null)}
        />
      )}
    </>
  )
}