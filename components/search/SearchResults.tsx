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

// ── helpers ──────────────────────────────────────────────────────────────────

function dbPinToPin(p: DbPinWithRelations): Pin {
  return { ...p, profile: p.profile ?? undefined, tags: p.tags }
}

const SPACING = [14, 18, 16, 20, 14, 16, 18, 14]

// ── Main client component ─────────────────────────────────────────────────────

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
  const [isPending, startTransition] = useTransition()

  // ── Local state ────────────────────────────────────────────────────────────
  const [keyword, setKeyword] = useState(initialKeyword)
  const [activeTag, setActiveTag] = useState<string>(initialTag)
  const [pins, setPins] = useState<DbPinWithRelations[]>(initialPins)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(initialPins.length)
  const [hasMore, setHasMore] = useState(initialPins.length === 20)
  const [cols, setCols] = useState(4)

  const currentQueryRef = useRef({ keyword: initialKeyword, tag: initialTag })
  const sentinelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Responsive columns ─────────────────────────────────────────────────────
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

  // ── Sync URL → state when user navigates back/forward ─────────────────────
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    const t = searchParams.get('tag') ?? ''
    setKeyword(q)
    setActiveTag(t)
  }, [searchParams])

  // ── Push URL changes ────────────────────────────────────────────────────────
  function pushUrl(kw: string, tg: string) {
    const params = new URLSearchParams()
    if (kw) params.set('q', kw)
    if (tg) params.set('tag', tg)
    const qs = params.toString()
    startTransition(() => {
      router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    })
  }

  // ── Fetch results ──────────────────────────────────────────────────────────
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
      const newOffset = append ? off + rows.length : rows.length
      setOffset(newOffset)
      setHasMore(json.hasMore ?? rows.length === 20)
      setLoading(false)
    },
    []
  )

  // ── Keyword input ─────────────────────────────────────────────────────────
  function handleKeywordChange(value: string) {
    setKeyword(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      currentQueryRef.current = { keyword: value, tag: activeTag }
      pushUrl(value, activeTag)
      fetchResults(value, activeTag, 0, false)
    }, 350)
  }

  function handleKeywordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    currentQueryRef.current = { keyword, tag: activeTag }
    pushUrl(keyword, activeTag)
    fetchResults(keyword, activeTag, 0, false)
  }

  // ── Tag selection ─────────────────────────────────────────────────────────
  function handleTagSelect(tag: string | null) {
    const next = tag ?? ''
    setActiveTag(next)
    currentQueryRef.current = { keyword, tag: next }
    pushUrl(keyword, next)
    fetchResults(keyword, next, 0, false)
  }

  // ── Infinite scroll ───────────────────────────────────────────────────────
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

  // ── Clear search ──────────────────────────────────────────────────────────
  function handleClear() {
    setKeyword('')
    setActiveTag('')
    currentQueryRef.current = { keyword: '', tag: '' }
    pushUrl('', '')
    fetchResults('', '', 0, false)
    inputRef.current?.focus()
  }

  const hasQuery = keyword.trim() || activeTag
  const gridStyle: React.CSSProperties = { columns: cols, columnGap: 16 }

  return (
    <>
      <div className="max-w-3xl mx-auto mb-8 space-y-5">

        {/* ── Search bar ── */}
        <form onSubmit={handleKeywordSubmit} className="relative">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5B6B73]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="search"
            value={keyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
            placeholder="Search projects by keyword…"
            className="w-full rounded-2xl border border-[#E6ECEA] bg-white py-4 pl-12 pr-12 text-sm text-[#0F1720] placeholder:text-[#5B6B73] outline-none focus:border-[#35C8B4] focus:ring-2 focus:ring-[#35C8B4]/20 transition shadow-sm"
          />
          {(keyword || isPending) && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isPending && (
                <span className="h-4 w-4 rounded-full border-2 border-[#C2F2E4] border-t-[#35C8B4] animate-spin" />
              )}
              {keyword && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E6ECEA] hover:bg-[#C2F2E4] transition-colors"
                  aria-label="Clear search"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#5B6B73" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </form>

        {/* ── Tag pills ── */}
        {popularTags.length > 0 && (
          <div>
            <p className="mb-2.5 text-xs font-semibold text-[#5B6B73] uppercase tracking-wide">
              Popular tags
            </p>
            <TagPills
              tags={popularTags}
              activeTag={activeTag || null}
              onSelect={handleTagSelect}
              showCount
              size="sm"
            />
          </div>
        )}

        {/* ── Active filters summary ── */}
        {hasQuery && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-[#5B6B73]">Showing results for</span>
            {keyword && (
              <span className="rounded-full bg-[#EDF7BE] border border-[#A4CF4A] px-3 py-1 text-xs font-semibold text-[#0F1720]">
                &quot;{keyword}&quot;
              </span>
            )}
            {activeTag && (
              <span className="rounded-full bg-[#C2F2E4] border border-[#35C8B4] px-3 py-1 text-xs font-semibold text-[#35C8B4]">
                #{activeTag}
              </span>
            )}
            <button
              onClick={handleClear}
              className="text-xs text-[#5B6B73] hover:text-[#35C8B4] underline transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {!loading && !error && pins.length === 0 && (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#C2F2E4]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#35C8B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-[#0F1720]">No results found</p>
          <p className="mt-1 text-sm text-[#5B6B73]">
            Try a different keyword or remove the tag filter.
          </p>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── Results masonry grid — same PinCard as landing page ── */}
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
              <PinCard
                pin={dbPinToPin(dbPin)}
                currentUserId={currentUserId}
              />
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
        <p className="py-12 text-center text-sm text-[#5B6B73]">
          End of results
        </p>
      )}
    </>
  )
}
