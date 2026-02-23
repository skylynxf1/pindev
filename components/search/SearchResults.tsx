'use client'

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useTransition,
} from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import TagPills from '@/components/pin/TagPills'
import BoardPickerModal from '@/components/boards/BoardPickerModal'
import type { DbPinWithRelations, DbTag } from '@/lib/db/types'
import type { Pin } from '@/types'

interface SearchResultsProps {
  initialPins: DbPinWithRelations[]
  popularTags: (DbTag & { count: number })[]
  initialKeyword: string
  initialTag: string
}

// ── tiny helpers ──────────────────────────────────────────────────────────────

function dbPinToPin(p: DbPinWithRelations): Pin {
  return {
    ...p,
    profile: p.profile ?? undefined,
    tags: p.tags,
  }
}

function ResultCard({
  pin,
  onSave,
}: {
  pin: DbPinWithRelations
  onSave: (pin: Pin) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [imgError, setImgError] = useState(false)

  return (
    <div
      className="group relative break-inside-avoid mb-4 rounded-2xl overflow-hidden border border-[#E6ECEA] bg-white shadow-sm hover:shadow-md transition-shadow"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link href={`/pin/${pin.id}`} scroll={false}>
        <div className="relative overflow-hidden bg-[#C2F2E4]/20" style={{ aspectRatio: '4/3' }}>
          <Image
            src={imgError ? '/placeholder.png' : pin.thumbnail_url}
            alt={pin.title || 'Project preview'}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover object-center"
            onError={() => setImgError(true)}
            unoptimized
          />
          {pin.media_type === 'video' && (
            <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
              VIDEO
            </span>
          )}
          <div
            className={`absolute inset-0 bg-black/20 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}
          />
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onSave(dbPinToPin(pin))
            }}
            className={`absolute top-3 right-3 rounded-full bg-[#35C8B4] px-4 py-2 text-xs font-bold text-white shadow
              hover:bg-[#A4CF4A] transition-all duration-150
              ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}
          >
            Save
          </button>
        </div>
      </Link>

      {/* Card footer */}
      <div className="px-3 py-2.5">
        {pin.title && (
          <Link href={`/pin/${pin.id}`} scroll={false}>
            <p className="text-sm font-semibold text-[#0F1720] truncate hover:text-[#35C8B4] transition-colors">
              {pin.title}
            </p>
          </Link>
        )}
        {pin.description && (
          <p className="mt-0.5 text-xs text-[#5B6B73] line-clamp-2 leading-relaxed">
            {pin.description}
          </p>
        )}
        {pin.tags.length > 0 && (
          <div className="mt-2">
            <TagPills
              tags={pin.tags}
              navigable
              size="sm"
            />
          </div>
        )}
        {pin.profile && (
          <Link
            href={`/profile/${pin.profile.username}`}
            className="mt-2 flex items-center gap-1.5 group/author"
          >
            <div className="h-5 w-5 rounded-full bg-[#C2F2E4] flex items-center justify-center text-[10px] font-bold text-[#35C8B4] overflow-hidden flex-shrink-0">
              {pin.profile.avatar_url ? (
                <Image
                  src={pin.profile.avatar_url}
                  alt={pin.profile.display_name || pin.profile.username}
                  width={20}
                  height={20}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                (pin.profile.display_name || pin.profile.username)
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>
            <span className="text-xs text-[#5B6B73] group-hover/author:text-[#35C8B4] transition-colors truncate">
              {pin.profile.display_name || pin.profile.username}
            </span>
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

export default function SearchResults({
  initialPins,
  popularTags,
  initialKeyword,
  initialTag,
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
  const [cursor, setCursor] = useState<string | null>(
    initialPins.length === 20 ? (initialPins[initialPins.length - 1]?.created_at ?? null) : null
  )
  const [hasMore, setHasMore] = useState(initialPins.length === 20)
  const [pinToSave, setPinToSave] = useState<Pin | null>(null)

  // Track the query that produced the current results so we know when to reset
  const currentQueryRef = useRef({ keyword: initialKeyword, tag: initialTag })

  const sentinelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Sync URL → state when user navigates back/forward ─────────────────────
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    const t = searchParams.get('tag') ?? ''
    setKeyword(q)
    setActiveTag(t)
  }, [searchParams])

  // ── Push URL changes (debounced for keyword, immediate for tag) ────────────
  function pushUrl(kw: string, tg: string) {
    const params = new URLSearchParams()
    if (kw) params.set('q', kw)
    if (tg) params.set('tag', tg)
    const qs = params.toString()
    startTransition(() => {
      router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    })
  }

  // ── Fetch a page of results ────────────────────────────────────────────────
  const fetchResults = useCallback(
    async (kw: string, tg: string, cur: string | null, append: boolean) => {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (kw) params.set('q', kw)
      if (tg) params.set('tag', tg)
      if (cur) params.set('cursor', cur)
      params.set('limit', '20')

      const res = await fetch(`/api/search/pins?${params.toString()}`)
      if (!res.ok) {
        setError('Search failed. Please try again.')
        setLoading(false)
        return
      }

      const json = await res.json()
      const rows: DbPinWithRelations[] = json.pins ?? []

      setPins((prev) => (append ? [...prev, ...rows] : rows))
      const nextCursor =
        rows.length === 20 ? (rows[rows.length - 1]?.created_at ?? null) : null
      setCursor(nextCursor)
      setHasMore(rows.length === 20)
      setLoading(false)
    },
    []
  )

  // ── Handle keyword input ───────────────────────────────────────────────────
  function handleKeywordChange(value: string) {
    setKeyword(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      currentQueryRef.current = { keyword: value, tag: activeTag }
      pushUrl(value, activeTag)
      fetchResults(value, activeTag, null, false)
    }, 350)
  }

  function handleKeywordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    currentQueryRef.current = { keyword, tag: activeTag }
    pushUrl(keyword, activeTag)
    fetchResults(keyword, activeTag, null, false)
  }

  // ── Handle tag selection ───────────────────────────────────────────────────
  function handleTagSelect(tag: string | null) {
    const next = tag ?? ''
    setActiveTag(next)
    currentQueryRef.current = { keyword, tag: next }
    pushUrl(keyword, next)
    fetchResults(keyword, next, null, false)
  }

  // ── Infinite scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const { keyword: kw, tag: tg } = currentQueryRef.current
          fetchResults(kw, tg, cursor, true)
        }
      },
      { rootMargin: '400px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, cursor, fetchResults])

  // ── Clear search ───────────────────────────────────────────────────────────
  function handleClear() {
    setKeyword('')
    setActiveTag('')
    currentQueryRef.current = { keyword: '', tag: '' }
    pushUrl('', '')
    fetchResults('', '', null, false)
    inputRef.current?.focus()
  }

  const hasQuery = keyword.trim() || activeTag

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
                "{keyword}"
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

      {/* ── Results grid ── */}
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

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {pins.length > 0 && (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
          {pins.map((pin) => (
            <ResultCard key={pin.id} pin={pin} onSave={setPinToSave} />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-px" />

      {/* Loading skeletons for next page */}
      {loading && pins.length > 0 && (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="mb-4 break-inside-avoid rounded-2xl bg-[#C2F2E4]/30 animate-pulse"
              style={{ height: `${180 + (i % 3) * 60}px` }}
            />
          ))}
        </div>
      )}

      {/* Initial loading (no results yet) */}
      {loading && pins.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <span className="h-8 w-8 rounded-full border-4 border-[#C2F2E4] border-t-[#35C8B4] animate-spin" />
        </div>
      )}

      {!hasMore && pins.length > 0 && (
        <p className="py-12 text-center text-sm text-[#5B6B73]">
          End of results ✦
        </p>
      )}

      {/* Save modal */}
      {pinToSave && (
        <BoardPickerModal
          pin={pinToSave}
          onClose={() => setPinToSave(null)}
        />
      )}
    </>
  )
}