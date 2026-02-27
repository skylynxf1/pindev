'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LandingAnimation from '@/components/LandingAnimation'
import MasonryGrid from '@/components/feed/MasonryGrid'
import AdminSortableGrid from '@/components/feed/AdminSortableGrid'
import CategoryFilterBar, { type CategoryId, type SortOrder } from '@/components/feed/CategoryFilterBar'
import { useFeed } from '@/lib/hooks/useFeed'
import { createClient } from '@/lib/supabase/client'
import type { Pin } from '@/types'

const CATEGORY_TAG_MAP: Record<string, string> = {
  design: 'design', ui: 'design', ux: 'design',
  website: 'website', web: 'website', landing: 'website',
  app: 'app', mobile: 'app', ios: 'app', android: 'app',
  'ai-tool': 'ai-tool', ai: 'ai-tool', ml: 'ai-tool', llm: 'ai-tool',
  vibecoding: 'vibecoding', 'vibe-coding': 'vibecoding', vibe: 'vibecoding',
  games: 'games', game: 'games', gaming: 'games',
}

/* ─────────────────────────────────────────────────────────────
   AUTH GATE MODAL
   ───────────────────────────────────────────────────────────── */
function AuthModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(15,23,32,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          padding: '48px 40px 40px',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--menthe)',
          boxShadow: '0 4px 16px rgb(53 200 180 / .35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.375rem', letterSpacing: '-0.05em', lineHeight: 1 }}>P</span>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          Welcome to PinDev
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'var(--muted)', margin: '0 0 32px', lineHeight: 1.55 }}>
          Discover live web & AI projects from builders around the world. Sign in to save, share, and create.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link
            href="/signup"
            style={{
              display: 'block', padding: '14px 0',
              borderRadius: 14, border: 'none',
              background: 'var(--menthe)',
              color: '#fff', fontSize: '0.9375rem', fontWeight: 700,
              textDecoration: 'none', textAlign: 'center',
              boxShadow: '0 4px 16px rgb(53 200 180 / .3)',
              transition: 'opacity 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          >
            Join free
          </Link>

          <Link
            href="/login"
            style={{
              display: 'block', padding: '13px 0',
              borderRadius: 14,
              border: '1.5px solid var(--border)',
              background: 'transparent',
              color: 'var(--text)', fontSize: '0.9375rem', fontWeight: 600,
              textDecoration: 'none', textAlign: 'center',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            Sign in
          </Link>
        </div>

        <button
          onClick={onDismiss}
          style={{
            marginTop: 20, background: 'none', border: 'none',
            cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--muted)',
            padding: '4px 8px', borderRadius: 8,
            transition: 'color 150ms',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
        >
          Browse as guest →
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   HOME PAGE
   ───────────────────────────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter()
  const { pins, loading, hasMore, error, fetchNextPage, removePin, updatePin, reorderPins } = useFeed({ scrollPageSize: 10 })
  const [selectedFilters, setSelectedFilters] = useState<Set<CategoryId>>(new Set(['all']))
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest')
  const [authReady, setAuthReady] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)
  const [authModalDismissed, setAuthModalDismissed] = useState(true)
  const [savedPinIds, setSavedPinIds] = useState<Set<string>>(new Set())
  const [isAdmin, setIsAdmin] = useState(false)
  const [reorderMode, setReorderMode] = useState(false)
  const [gridCols, setGridCols] = useState(4)
  const [likesMap, setLikesMap] = useState<Record<string, { likeCount: number; likedByMe: boolean }>>({})

  // Batch-fetch likes whenever the pin list grows (one request per page of pins)
  useEffect(() => {
    if (pins.length === 0) return
    const ids = pins.map(p => p.id).join(',')
    fetch(`/api/pins/likes?ids=${ids}`)
      .then(r => r.ok ? r.json() : {})
      .then(data => setLikesMap(prev => ({ ...prev, ...data })))
      .catch(() => {})
  }, [pins])

  const handleAdminDelete = useCallback((id: string) => removePin(id), [removePin])

  const handleReorder = useCallback(async (ids: string[]) => {
    reorderPins(ids)
    await fetch('/api/admin/pins/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
  }, [reorderPins])

  const handleEmptyClick = useCallback(() => {
    if (isLoggedIn) {
      router.push('/upload')
    } else {
      setAuthModalDismissed(false)
    }
  }, [isLoggedIn, router])

  const handleFeatureToggle = useCallback((id: string, featuredUntil: string | null) => {
    const pin = pins.find(p => p.id === id)
    if (pin) updatePin({ ...pin, featured_until: featuredUntil })
  }, [pins, updatePin])

  const handleFilterToggle = useCallback((id: CategoryId) => {
    setSelectedFilters(prev => {
      // Clicking "All" always resets to only "All"
      if (id === 'all') {
        return new Set<CategoryId>(['all'])
      }

      const next = new Set(prev)
      // Any non-all click removes "all"
      next.delete('all')

      // Toggle the clicked filter
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      // If nothing left, revert to "All"
      if (next.size === 0) {
        return new Set<CategoryId>(['all'])
      }

      return next
    })
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id
      setIsLoggedIn(!!userId)
      setCurrentUserId(userId)
      setAuthReady(true)
      if (userId) {
        fetch('/api/saved-pins?ids_only=true')
          .then(r => r.json())
          .then(d => setSavedPinIds(new Set(d.ids ?? [])))
          .catch(() => {})
        supabase.from('profiles').select('username').eq('id', userId).single()
          .then(({ data: p }) => setIsAdmin(p?.username === 'pindev'))
      }
    })
  }, [])

  /* Multi-select filtering:
     - Categories combine with OR (pin matches if ANY tag maps to ANY selected category).
     - Featured acts as AND constraint: when combined with categories, only featured
       pins that also match a selected category are shown. Alone, shows all featured. */
  const filteredPins = useMemo(() => {
    if (selectedFilters.has('all')) {
      let result = pins
      if (sortOrder === 'oldest') {
        result = [...result].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }
      return result
    }

    const categoryFilters = [...selectedFilters].filter(f => f !== 'featured')
    const hasFeatured = selectedFilters.has('featured')

    let result = pins

    // Category OR filtering
    if (categoryFilters.length > 0) {
      const catSet: Set<string> = new Set(categoryFilters)
      result = result.filter(pin =>
        pin.tags?.some(tag => {
          const mapped = CATEGORY_TAG_MAP[tag.name.toLowerCase()]
          return mapped !== undefined && catSet.has(mapped)
        })
      )
    }

    // Featured AND constraint
    if (hasFeatured) {
      const now = new Date()
      result = result.filter(p => p.featured_until && new Date(p.featured_until) > now)
    }

    if (sortOrder === 'oldest') {
      result = [...result].sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }

    return result
  }, [pins, selectedFilters, sortOrder])

  const showAuthModal = authReady && !isLoggedIn && !authModalDismissed

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <LandingAnimation />

      {/* Sticky filter bar */}
      <div
        style={{
          position: 'sticky',
          top: 'var(--header-h)',
          zIndex: 30,
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ maxWidth: 1800, margin: '0 auto', padding: '0 24px' }}>
          <CategoryFilterBar
            active={selectedFilters}
            onToggle={handleFilterToggle}
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
          />
        </div>
      </div>

      {/* Feed */}
      <div style={{ maxWidth: 1800, margin: '0 auto', padding: '24px 24px' }}>
        {error && (
          <div style={{
            marginBottom: 20, borderRadius: 16,
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

        {/* Admin reorder toggle */}
        {isAdmin && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button
              onClick={() => setReorderMode(r => !r)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 10,
                border: `1.5px solid ${reorderMode ? 'var(--menthe)' : 'var(--border)'}`,
                background: reorderMode ? 'var(--menthe-light)' : 'transparent',
                color: reorderMode ? 'var(--menthe)' : 'var(--muted)',
                fontSize: '0.8125rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 150ms',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              {reorderMode ? 'Done reordering' : 'Reorder feed'}
            </button>
          </div>
        )}

        {reorderMode && isAdmin ? (
          <AdminSortableGrid
            pins={filteredPins}
            currentUserId={currentUserId}
            onDelete={removePin}
            onAdminDelete={handleAdminDelete}
            onEdit={updatePin}
            onEmptyClick={handleEmptyClick}
            savedPinIds={savedPinIds}
            cols={gridCols}
            onReorder={handleReorder}
          />
        ) : (
          <MasonryGrid
            pins={filteredPins}
            hasMore={hasMore && selectedFilters.has('all')}
            loading={loading}
            onLoadMore={fetchNextPage}
            onSave={() => setAuthModalDismissed(false)}
            onEmptyClick={handleEmptyClick}
            currentUserId={currentUserId}
            onDelete={removePin}
            onEdit={updatePin}
            onAdminDelete={handleAdminDelete}
            onFeatureToggle={handleFeatureToggle}
            isAdmin={isAdmin}
            savedPinIds={savedPinIds}
            onColsChange={setGridCols}
            likesMap={likesMap}
            onAuthRequired={() => setAuthModalDismissed(false)}
          />
        )}
      </div>

      {/* Auth gate modal */}
      {showAuthModal && <AuthModal onDismiss={() => setAuthModalDismissed(true)} />}
    </main>
  )
}
