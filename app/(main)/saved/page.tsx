'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import MasonryGrid from '@/components/feed/MasonryGrid'
import { createClient } from '@/lib/supabase/client'
import type { Pin } from '@/types'

const PLACEHOLDER_HEIGHTS = [280, 360, 220, 400, 300, 340, 240, 380, 260, 320, 290, 440]

export default function SavedPage() {
  const router = useRouter()
  const [pins, setPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)
  const fetchedRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id)
    })
  }, [])

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetch('/api/saved-pins')
      .then(r => r.json())
      .then(data => {
        setPins(data.pins ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load saved pins.')
        setLoading(false)
      })
  }, [])

  function removePin(id: string) {
    setPins(prev => prev.filter(p => p.id !== id))
  }

  // noop — saved page has no more pages (loads all at once)
  const noopLoadMore = useCallback(() => {}, [])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1800, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Page header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--menthe)',
            boxShadow: '0 4px 20px rgb(53 200 180 / .35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h1 style={{
            fontSize: '1.875rem', fontWeight: 800,
            color: 'var(--text)', margin: '0 0 8px',
            letterSpacing: '-0.025em',
          }}>
            Saved projects
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--muted)', margin: 0 }}>
            Your personal collection of genius ideas
          </p>
        </div>

        {/* Error */}
        {error && !loading && (
          <div style={{
            marginBottom: 24, borderRadius: 16,
            border: '1px solid #fecaca', background: '#fef2f2',
            padding: '14px 20px', fontSize: '0.875rem', color: '#dc2626',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Masonry grid — uses same component as home feed */}
        {!error && (
          <MasonryGrid
            pins={pins}
            hasMore={false}
            loading={loading}
            onLoadMore={noopLoadMore}
            onEmptyClick={() => router.push('/')}
            currentUserId={currentUserId}
            onDelete={removePin}
            onUnsave={removePin}
            allSaved
            emptyText="save some genius ideas..."
            emptySubtext="browse the feed →"
          />
        )}
      </div>
    </main>
  )
}
