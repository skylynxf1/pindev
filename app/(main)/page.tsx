'use client'

import { useState, useMemo } from 'react'
import MasonryGrid from '@/components/feed/MasonryGrid'
import CategoryFilterBar, { type CategoryId } from '@/components/feed/CategoryFilterBar'
import BoardPickerModal from '@/components/boards/BoardPickerModal'
import { usePins } from '@/lib/hooks/usePins'
import type { Pin } from '@/types'

const CATEGORY_TAG_MAP: Record<string, string> = {
  website: 'website', web: 'website', landing: 'website',
  app: 'app', mobile: 'app', ios: 'app', android: 'app',
  'ai-tool': 'ai-tool', ai: 'ai-tool', ml: 'ai-tool', llm: 'ai-tool',
  vibecoding: 'vibecoding', 'vibe-coding': 'vibecoding', vibe: 'vibecoding',
}

function getPinCategory(pin: Pin): string | null {
  if (!pin.tags?.length) return null
  for (const tag of pin.tags) {
    const match = CATEGORY_TAG_MAP[tag.name.toLowerCase()]
    if (match) return match
  }
  return null
}

export default function HomePage() {
  const { pins, loading, hasMore, error, fetchNextPage } = usePins()
  const [pinToSave, setPinToSave] = useState<Pin | null>(null)
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all')

  const filteredPins = useMemo(() => {
    if (activeCategory === 'all') return pins
    return pins.filter(pin => getPinCategory(pin) === activeCategory)
  }, [pins, activeCategory])

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
        {/* Category filter bar */}
        <CategoryFilterBar active={activeCategory} onChange={setActiveCategory} />

        <div className="py-6">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <MasonryGrid
            pins={filteredPins}
            hasMore={hasMore}
            loading={loading}
            onLoadMore={fetchNextPage}
            onSave={(pin) => setPinToSave(pin)}
          />
        </div>
      </div>

      {pinToSave && (
        <BoardPickerModal
          pin={pinToSave}
          onClose={() => setPinToSave(null)}
        />
      )}
    </main>
  )
}
