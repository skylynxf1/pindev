'use client'

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useTransition,
} from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import PinCard from '@/components/feed/PinCard'
import TagPills from '@/components/pin/TagPills'
import { PLACEHOLDER_HEIGHTS } from '@/components/feed/PlaceholderCard'
import type { DbPinWithRelations, DbTag } from '@/lib/db/types'
import type { Pin } from '@/types'

interface SearchResultsProps {
  initialPins: DbPinWithRelations[]
  popularTags: (DbTag & { count: number })[]
  initialKeyword: string
  initialTag: string
  currentUserId?: string
}

function dbPinToPin(p: DbPinWithRelations): Pin {
  return { ...p, profile: p.profile ?? undefined, tags: p.tags }
}

const SPACING = [14, 18, 16, 20, 14, 16, 18, 14]

// ── localStorage helpers for frequent-keyword tracking ───────────────────────

function getSearchCounts(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem('pindev_search_counts') ?? '{}') }
  catch { return {} }
}

function incrementSearchCount(kw: string) {
  const k = kw.trim().toLowerCase()
  if (k.length < 2) return
  const counts = getSearchCounts()
  counts[k] = (counts[k] ?? 0) + 1
  localStorage.setItem('pindev_search_counts', JSON.stringify(counts))
}

function getFrequentKeywords(exclude: string[]): string[] {
  const lower = exclude.map(s => s.toLowerCase())
  return Object.entries(getSearchCounts())
    .filter(([kw, n]) => n > 3 && !lower.includes(kw))
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([kw]) => kw)
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SearchResults({
  initialPins,
  popularTags,
  initialKeyword,
  initialTag,
  currentUserId,
}: SearchResultsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [keyword, setKeyword] = useState(initialKeyword)
  const [activeTag, setActiveTag] = useState<string>(initialTag)
  const [pins, setPins] = useState<DbPinWithRelations[]>(initialPins)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(initialPins.length)
  const [hasMore, setHasMore] = useState(initialPins.length === 20)
  const [cols, setCols] = useState(4)
  const [frequentKeywords, setFrequentKeywords] = useState<string[]>([])

  const currentQueryRef = useRef({ keyword: initialKeyword, tag: initialTag })
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  // Load frequent keywords from localStorage on mount
  useEffect(() => {
    setFrequentKeywords(getFrequentKeywords(popularTags.map(t => t.name)))
  }, [popularTags])

  // ── Responsive columns ──────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w < 640) setCols(1)
      else if (w < 900) setCols(2)
      else if (w < 1200) setCols(3)
      else if (w < 1500) setCols(4)
      else if (w < 1800) setCols(5)
      else setCols(6)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // ── Fetch results ───────────────────────────────────────────────────────────
  const fetchResults = useCallback(
    async (kw: string, tg: string, off: number, append: boolean) => {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (kw) params.set('q', kw)
      if (tg) params.set('tag', tg)
      params.set('offset', String(off))
      params.set('limit', '20')

      const res = await fetch(`/api/search/pins?${params.toString()}`)
      if (!res.ok) {
        setError('Search failed. Please try again.')
        setLoading(false)
        return
      }

      const json = await res.json()
      const rows: DbPinWithRelations[] = json.pins ?? []

      setPins(prev => (append ? [...prev, ...rows] : rows))
      setOffset(append ? off + rows.length : rows.length)
      setHasMore(json.hasMore ?? rows.length === 20)
      setLoading(false)
    },
    []
  )

  // ── Sync URL → state; only fetch after first render (SSR handles initial load)
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    const t = searchParams.get('tag') ?? ''

    setKeyword(q)
    setActiveTag(t)
    currentQueryRef.current = { keyword: q, tag: t }

    if (isFirstRender.current) {
      isFirstRender.current = false
      return // use SSR-loaded initialPins on first render
    }

    // Track keyword frequency
    if (q) {
      incrementSearchCount(q)
      setFrequentKeywords(getFrequentKeywords(popularTags.map(p => p.name)))
    }

    fetchResults(q, t, 0, false)
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Push URL (tag clicks, clear) — fetch triggered by searchParams effect ───
  function pushUrl(kw: string, tg: string) {
    const params = new URLSearchParams()
    if (kw) params.set('q', kw)
    if (tg) params.set('tag', tg)
    const qs = params.toString()
    startTransition(() => {
      router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    })
  }

  function handleTagSelect(tag: string | null) {
    pushUrl(keyword, tag ?? '')
  }

  function handleFrequentKwSelect(kw: string) {
    pushUrl(kw, '')
  }

  function handleClear() {
    pushUrl('', '')
  }

  // ── Infinite scroll ─────────────────────────────────────────────────────────
  const hasMoreRef = useRef(hasMore)
  const loadingRef = useRef(loading)
  const offsetRef = useRef(offset)
  useEffect(() => { hasMoreRef.current = hasMore }, [hasMore])
  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { offsetRef.current = offset }, [offset])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
          const { keyword: kw, tag: tg } = currentQueryRef.current
          fetchResults(kw, tg, offsetRef.current, true)
        }
      },
      { rootMargin: '400px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchResults])

  const hasQuery = keyword.trim() || activeTag
  const gridStyle: React.CSSProperties = { columns: cols, columnGap: 16 }

  return (
    <>
      {/* ── Tags + filter bar ── */}
      <div className="max-w-3xl mx-auto" style={{ marginBottom: 56, marginTop: 32 }}>

        {/* Popular tags */}
        {popularTags.length > 0 && (
          <div style={{ marginBottom: hasQuery ? 32 : 0 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
              <span className="h-2 w-2 rounded-full bg-[#35C8B4] shrink-0" />
              <p className="text-xs font-semibold text-[#5B6B73] uppercase tracking-wide">
                Popular tags
              </p>
            </div>

            <TagPills
              tags={popularTags}
              activeTag={activeTag || null}
              onSelect={handleTagSelect}
              showCount
              size="md"
            />

            {/* Trending searches — search page only, shown when >3 searches logged */}
            {frequentKeywords.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {frequentKeywords.map(kw => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => handleFrequentKwSelect(kw)}
                    className={`tag-pill${keyword === kw ? ' active' : ''}`}
                    style={{ gap: 5 }}
                  >
                    <svg
                      width="9" height="9" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ opacity: 0.5, flexShrink: 0 }}
                    >
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    {kw}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active filters summary */}
        {hasQuery && (
          <div
            className="flex items-center justify-between gap-3"
            style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}
          >
            <div className="flex items-center gap-2 flex-wrap min-w-0">
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
      </div>

      {/* ── Empty state ── */}
      {!loading && !error && pins.length === 0 && (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div style={{
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--menthe-light)',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)' }}>No results found</p>
          <p style={{ marginTop: 4, fontSize: '0.875rem', color: 'var(--muted)' }}>
            Try a different keyword or remove the tag filter.
          </p>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{
          marginBottom: 24,
          borderRadius: 16,
          border: '1px solid var(--danger)',
          background: 'var(--danger-bg)',
          padding: '14px 20px',
          fontSize: '0.875rem',
          color: 'var(--danger)',
        }}>
          {error}
        </div>
      )}

      {/* ── Results masonry grid ── */}
      {pins.length > 0 && (
        <div style={gridStyle}>
          {pins.map((dbPin, i) => (
            <div
              key={dbPin.id}
              style={{
                marginBottom: SPACING[i % SPACING.length],
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
              }}
            >
              <PinCard pin={dbPinToPin(dbPin)} currentUserId={currentUserId} />
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* Loading skeletons */}
      {loading && (
        <div style={{ ...gridStyle, marginTop: pins.length > 0 ? 16 : 0 }}>
          {Array.from({ length: cols * 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                marginBottom: SPACING[i % SPACING.length],
                breakInside: 'avoid',
                height: PLACEHOLDER_HEIGHTS[i % PLACEHOLDER_HEIGHTS.length],
                borderRadius: 18,
                background: 'var(--menthe-light)',
                opacity: 0.45,
              }}
            />
          ))}
        </div>
      )}

      {!hasMore && pins.length > 0 && (
        <div style={{ padding: '48px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <p style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--muted-light)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            End of results
          </p>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
      )}
    </>
  )
}
