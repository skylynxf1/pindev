import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { searchPins } from '@/lib/db/queries'
import { expandQuery } from '@/lib/search/expand'
import SearchResults from '@/components/search/SearchResults'
import type { Metadata } from 'next'
import type { Pin } from '@/types'
import type { DbTag } from '@/lib/db/types'

interface PageProps {
  searchParams: Promise<{ q?: string; tag?: string }>
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { q, tag } = await searchParams
  const parts: string[] = []
  if (q) parts.push(`"${q}"`)
  if (tag) parts.push(`#${tag}`)
  const label = parts.length > 0 ? parts.join(' · ') : 'Discover projects'
  return {
    title: `${label} · PinDev`,
    description: 'Search live web and AI projects on PinDev.',
  }
}

const PIN_SELECT = `
  id, owner_id, title, description, live_url, repo_url,
  media_url, media_type, thumbnail_url, is_published,
  created_at, updated_at, likes_count, clicks_count,
  impressions_count, has_video, admin_pinned_position, admin_pinned_until,
  profiles ( username, display_name, avatar_url ),
  pin_tags ( tags ( id, name ) )
`.trim()

function normaliseToPin(row: Record<string, unknown>): Pin {
  const rawProfile = row.profiles
  const profile = Array.isArray(rawProfile)
    ? (rawProfile[0] ?? undefined)
    : (rawProfile as Pin['profile'] ?? undefined)

  const rawPinTags = Array.isArray(row.pin_tags) ? row.pin_tags : []
  const tags: DbTag[] = rawPinTags
    .map((pt: unknown) => {
      if (pt && typeof pt === 'object') {
        const t = (pt as Record<string, unknown>).tags
        if (t && typeof t === 'object') {
          const tag = t as Record<string, unknown>
          if (typeof tag.id === 'string' && typeof tag.name === 'string') {
            return { id: tag.id, name: tag.name }
          }
        }
      }
      return null
    })
    .filter((t): t is DbTag => t !== null)

  return {
    id: row.id as string,
    owner_id: row.owner_id as string,
    title: row.title as string,
    description: row.description as string,
    live_url: row.live_url as string,
    repo_url: row.repo_url as string | null,
    media_url: row.media_url as string,
    media_type: row.media_type as 'image' | 'video',
    thumbnail_url: row.thumbnail_url as string,
    is_published: row.is_published as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    likes_count: (row.likes_count as number) ?? 0,
    clicks_count: (row.clicks_count as number) ?? 0,
    impressions_count: (row.impressions_count as number) ?? 0,
    has_video: (row.has_video as boolean) ?? false,
    admin_pinned_position: (row.admin_pinned_position as number | null) ?? null,
    admin_pinned_until: (row.admin_pinned_until as string | null) ?? null,
    profile,
    tags,
  }
}

// ── Server component — runs initial search on the server for SSR ─────────────

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '', tag = '' } = await searchParams
  const supabase = await createClient()

  let initialPins: Pin[] = []

  if (q.trim()) {
    // Use hybrid RPC for keyword searches
    const expanded = expandQuery(q)
    const { data: rpcRows } = await supabase.rpc('search_pins_ranked', {
      search_query: expanded,
      tag_filter: tag.trim().toLowerCase(),
      result_limit: 20,
      result_offset: 0,
    })

    const pinIds = ((rpcRows ?? []) as Record<string, unknown>[]).map(r => r.id as string)

    if (pinIds.length > 0) {
      const { data: enriched } = await supabase
        .from('pins')
        .select(PIN_SELECT)
        .in('id', pinIds)

      // Preserve rank order
      const map = new Map<string, Pin>()
      for (const row of ((enriched ?? []) as unknown as Record<string, unknown>[])) {
        const pin = normaliseToPin(row)
        map.set(pin.id, pin)
      }
      initialPins = pinIds.map(id => map.get(id)).filter((p): p is Pin => p !== undefined)
    }
  } else {
    // No keyword — use existing searchPins for newest-first browsing
    const result = await searchPins(supabase, { keyword: '', tag, limit: 20 })
    initialPins = (result.data ?? []).map(p => ({
      ...p,
      profile: p.profile ?? undefined,
    }))
  }

  return (
    <Suspense>
      <SearchResults
        initialPins={initialPins}
        initialKeyword={q}
        initialTag={tag}
      />
    </Suspense>
  )
}
