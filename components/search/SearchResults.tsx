'use client'

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useTransition,
} from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import MasonryGrid from '@/components/feed/MasonryGrid'
import CategoryFilterBar, { type CategoryId, type SortOrder } from '@/components/feed/CategoryFilterBar'
import { CATEGORY_TAG_MAP } from '@/lib/categories'
import { createClient } from '@/lib/supabase/client'
import type { Pin } from '@/types'

interface SearchResultsProps {
  initialPins: Pin[]
  initialKeyword: string
  initialTag: string
}

export default function SearchResults({
  initialPins,
  initialKeyword,
  initialTag,
}: SearchResultsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  // ── Search state ─────────────────────────────────────────────────────────
  const [keyword, setKeyword] = useState(initialKeyword)
  const [activeTag, setActiveTag] = useState<string>(initialTag)
  const [pins, setPins] = useState<Pin[]>(initialPins)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(initialPins.length)
  const [hasMore, setHasMore] = useState(initialPins.length === 20)

  // ── Filter state (mirrors Home) ──────────────────────────────────────────
  const [selectedFilters, setSelectedFilters] = useState<Set<CategoryId>>(new Set(['all']))
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest')

  // ── Auth + saved + likes (mirrors Home) ──────────────────────────────────
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)
  const [savedPinIds, setSavedPinIds] = useState<Set<string>>(new Set())
  const [likesMap, setLikesMap] = useState<Record<string, { likeCount: number; likedByMe: boolean }>>({})

  const currentQueryRef = useRef({ keyword: initialKeyword, tag: initialTag })
  const isFirstRender = useRef(true)

  // ── Auth check on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id
      setCurrentUserId(userId)
      if (userId) {
        fetch('/api/saved-pins?ids_only=true')
          .then(r => r.json())
          .then(d => setSavedPinIds(new Set(d.ids ?? [])))
          .catch(() => {})
      }
    })
  }, [])

  // ── Batch-fetch likes whenever pin list grows ────────────────────────────
  useEffect(() => {
    if (pins.length === 0) return
    const ids = pins.map(p => p.id).join(',')
    fetch(`/api/pins/likes?ids=${ids}`)
      .then(r => r.ok ? r.json() : {})
      .then(data => setLikesMap(prev => ({ ...prev, ...data })))
      .catch(() => {})
  }, [pins])

  // ── Fetch results ────────────────────────────────────────────────────────
  const fetchResults = useCallback(
    async (kw: string, tg: string, off: number, append: boolean) => {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (kw) params.set('q', kw)
      if (tg) params.set('tag', tg)
      params.set('offset', String(off))
      params.set('limit', '20')

      try {
        const res = await fetch(`/api/search/pins?${params.toString()}`)
        if (!res.ok) {
          setError('Search failed. Please try again.')
          setLoading(false)
          return
        }

        const json = await res.json()
        const rows: Pin[] = json.pins ?? []

        setPins(prev => (append ? [...prev, ...rows] : rows))
        setOffset(append ? off + rows.length : rows.length)
        setHasMore(json.hasMore ?? rows.length === 20)
      } catch {
        setError('Search failed. Please try again.')
      }
      setLoading(false)
    },
    []
  )

  // ── Sync URL → state ────────────────────────────────────────────────────
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    const t = searchParams.get('tag') ?? ''

    setKeyword(q)
    setActiveTag(t)
    currentQueryRef.current = { keyword: q, tag: t }

    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    fetchResults(q, t, 0, false)
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Push URL (clear) ────────────────────────────────────────────────────
  function pushUrl(kw: string, tg: string) {
    const params = new URLSearchParams()
    if (kw) params.set('q', kw)
    if (tg) params.set('tag', tg)
    const qs = params.toString()
    startTransition(() => {
      router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    })
  }

  function handleClear() {
    pushUrl('', '')
  }

  // ── Load more for infinite scroll ────────────────────────────────────────
  const fetchNextPage = useCallback(() => {
    const { keyword: kw, tag: tg } = currentQueryRef.current
    fetchResults(kw, tg, offset, true)
  }, [fetchResults, offset])

  // ── Category filter toggle (identical to Home) ───────────────────────────
  const handleFilterToggle = useCallback((id: CategoryId) => {
    setSelectedFilters(prev => {
      if (id === 'all') return new Set<CategoryId>(['all'])
      const next = new Set(prev)
      next.delete('all')
      if (next.has(id)) next.delete(id)
      else next.add(id)
      if (next.size === 0) return new Set<CategoryId>(['all'])
      return next
    })
  }, [])

  // ── Client-side category + featured filtering (identical to Home) ───────
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

    if (categoryFilters.length > 0) {
      const catSet: Set<string> = new Set(categoryFilters)
      result = result.filter(pin =>
        pin.tags?.some(tag => {
          const mapped = CATEGORY_TAG_MAP[tag.name.toLowerCase()]
          return mapped !== undefined && catSet.has(mapped)
        })
      )
    }

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

  const hasQuery = keyword.trim() || activeTag

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sticky filter bar — same as Home */}
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

      {/* Content */}
      <div style={{ maxWidth: 1800, margin: '0 auto', padding: '24px 24px' }}>
        {/* Active query header */}
        {hasQuery && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 20,
              paddingBottom: 12,
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--muted)', flexShrink: 0 }}>
                Showing results for
              </span>
              {keyword && (
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>
                  &quot;{keyword}&quot;
                </span>
              )}
              {activeTag && (
                <span style={{
                  borderRadius: 9999,
                  background: 'var(--brume)',
                  padding: '2px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--menthe)',
                }}>
                  #{activeTag}
                </span>
              )}
              {!loading && (
                <>
                  <span style={{ color: 'var(--border)', fontSize: '0.875rem' }}>·</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted)' }}>
                    {pins.length}{hasMore ? '+' : ''} result{pins.length !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
            <button
              onClick={handleClear}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
                fontSize: '0.75rem',
                fontWeight: 500,
                color: 'var(--muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'color 140ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
            >
              Clear
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'var(--surface-2)',
                fontSize: '0.625rem',
                lineHeight: 1,
              }}>×</span>
            </button>
          </div>
        )}

        {/* Error */}
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

        {/* Masonry grid — same component as Home */}
        <MasonryGrid
          pins={filteredPins}
          hasMore={hasMore && selectedFilters.has('all')}
          loading={loading}
          onLoadMore={fetchNextPage}
          currentUserId={currentUserId}
          savedPinIds={savedPinIds}
          likesMap={likesMap}
          emptyText="No results found"
          emptySubtext="Try a different keyword or remove filters."
        />
      </div>
    </main>
  )
}
