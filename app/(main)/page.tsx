'use client'

import { useState } from 'react'
import MasonryGrid from '@/components/feed/MasonryGrid'
import BoardPickerModal from '@/components/boards/BoardPickerModal'
import { usePins } from '@/lib/hooks/usePins'
import type { Pin } from '@/types'

export default function HomePage() {
  const { pins, loading, hasMore, error, fetchNextPage } = usePins()
  const [pinToSave, setPinToSave] = useState<Pin | null>(null)

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6">

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <MasonryGrid
          pins={pins}
          hasMore={hasMore}
          loading={loading}
          onLoadMore={fetchNextPage}
          onSave={(pin) => setPinToSave(pin)}
        />
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