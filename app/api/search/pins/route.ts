import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { expandQuery } from '@/lib/search/expand'
import type { DbTag } from '@/lib/db/types'

// ── Shared select for the non-keyword (browse) path ─────────────────────────

const PIN_SELECT = `
  id, owner_id, title, description, live_url, repo_url,
  media_url, media_type, thumbnail_url, is_published,
  created_at, updated_at, likes_count, clicks_count,
  impressions_count, has_video, admin_pinned_position, admin_pinned_until,
  profiles ( username, display_name, avatar_url ),
  pin_tags ( tags ( id, name ) )
`.trim()

type NormalisedPin = {
  id: string
  owner_id: string
  title: string
  description: string
  live_url: string
  repo_url: string | null
  media_url: string
  media_type: 'image' | 'video'
  thumbnail_url: string
  is_published: boolean
  created_at: string
  updated_at: string
  likes_count: number
  clicks_count: number
  impressions_count: number
  has_video: boolean
  admin_pinned_position: number | null
  admin_pinned_until: string | null
  profile: { username: string; display_name: string; avatar_url: string | null } | null
  tags: DbTag[]
}

function normalisePin(row: Record<string, unknown>): NormalisedPin {
  const rawProfile = row.profiles
  const profile = Array.isArray(rawProfile)
    ? (rawProfile[0] ?? null)
    : (rawProfile as NormalisedPin['profile'] ?? null)

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
    id:                    row.id as string,
    owner_id:              row.owner_id as string,
    title:                 row.title as string,
    description:           row.description as string,
    live_url:              row.live_url as string,
    repo_url:              row.repo_url as string | null,
    media_url:             row.media_url as string,
    media_type:            row.media_type as 'image' | 'video',
    thumbnail_url:         row.thumbnail_url as string,
    is_published:          row.is_published as boolean,
    created_at:            row.created_at as string,
    updated_at:            row.updated_at as string,
    likes_count:           (row.likes_count as number)       ?? 0,
    clicks_count:          (row.clicks_count as number)      ?? 0,
    impressions_count:     (row.impressions_count as number) ?? 0,
    has_video:             (row.has_video as boolean)        ?? false,
    admin_pinned_position: (row.admin_pinned_position as number | null) ?? null,
    admin_pinned_until:    (row.admin_pinned_until as string | null)    ?? null,
    profile,
    tags,
  }
}

// ── GET /api/search/pins ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const keyword = searchParams.get('q') ?? ''
  const tag = searchParams.get('tag') ?? ''
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0)
  const limit = Math.min(
    parseInt(searchParams.get('limit') ?? '20', 10) || 20,
    50,
  )

  const supabase = await createClient()

  // ── Keyword present → hybrid ranked search via RPC ────────────────────────
  if (keyword.trim()) {
    // Expand query with synonyms + stemming
    const expanded = expandQuery(keyword)

    // Call the Postgres RPC that does pg_trgm + FTS + hybrid scoring
    // Request limit+1 to detect hasMore
    const { data: rpcRows, error: rpcError } = await supabase.rpc(
      'search_pins_ranked',
      {
        search_query: expanded,
        tag_filter: tag.trim().toLowerCase(),
        result_limit: limit + 1,
        result_offset: offset,
      },
    )

    if (rpcError) {
      console.error('search_pins_ranked RPC error:', rpcError)
      return NextResponse.json({ error: 'Search failed.' }, { status: 500 })
    }

    const rows = (rpcRows ?? []) as Record<string, unknown>[]
    const hasMore = rows.length > limit
    const pageRows = hasMore ? rows.slice(0, limit) : rows
    const pinIds = pageRows.map(r => r.id as string)

    if (pinIds.length === 0) {
      return NextResponse.json({ pins: [], hasMore: false })
    }

    // Fetch profiles + tags for the result IDs (RPC returns flat rows)
    const { data: enriched } = await supabase
      .from('pins')
      .select(PIN_SELECT)
      .in('id', pinIds)

    // Build a lookup by id, preserving the RPC's rank order
    const enrichedMap = new Map<string, NormalisedPin>()
    for (const row of ((enriched ?? []) as unknown as Record<string, unknown>[])) {
      const pin = normalisePin(row)
      enrichedMap.set(pin.id, pin)
    }

    // Return in score order
    const page = pinIds
      .map(id => enrichedMap.get(id))
      .filter((p): p is NormalisedPin => p !== undefined)

    return NextResponse.json({ pins: page, hasMore })
  }

  // ── No keyword → newest first with offset pagination ────────────────────
  let query = supabase
    .from('pins')
    .select(PIN_SELECT)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (offset > 0) {
    query = query.range(offset, offset + limit)
  }

  // Tag filter
  if (tag.trim()) {
    const { data: tagRow } = await supabase
      .from('tags')
      .select('id')
      .eq('name', tag.trim().toLowerCase())
      .maybeSingle()
    if (tagRow) {
      query = query.eq('pin_tags.tag_id', tagRow.id)
    }
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 })
  }

  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map(normalisePin)
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return NextResponse.json({ pins: page, hasMore })
}
