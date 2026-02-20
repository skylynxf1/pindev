import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  DbPinWithRelations,
  DbTag,
  PinSearchParams,
  QueryResult,
} from './types'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

// ── Internal row normaliser ───────────────────────────────────────────────────
// Supabase returns joined tables as nested objects or arrays depending on
// cardinality.  This function always produces the consistent DbPinWithRelations
// shape regardless of what the query came back with.

function normalisePin(row: Record<string, unknown>): DbPinWithRelations {
  // profiles is 1:1 via foreign key — Supabase may return object or array
  const rawProfile = row.profiles
  const profile = Array.isArray(rawProfile)
    ? (rawProfile[0] ?? null)
    : (rawProfile as DbPinWithRelations['profile'] ?? null)

  // pin_tags is 1:many — normalise each nested tag
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
    id:            row.id as string,
    owner_id:      row.owner_id as string,
    title:         row.title as string,
    description:   row.description as string,
    live_url:      row.live_url as string,
    repo_url:      row.repo_url as string | null,
    media_url:     row.media_url as string,
    media_type:    row.media_type as 'image' | 'video',
    thumbnail_url: row.thumbnail_url as string,
    is_published:  row.is_published as boolean,
    created_at:    row.created_at as string,
    updated_at:    row.updated_at as string,
    profile,
    tags,
  }
}

// ── Shared select fragment ────────────────────────────────────────────────────

const PIN_SELECT = `
  id, owner_id, title, description, live_url, repo_url,
  media_url, media_type, thumbnail_url, is_published,
  created_at, updated_at,
  profiles ( username, display_name, avatar_url ),
  pin_tags ( tags ( id, name ) )
`.trim()

// ── searchPins ────────────────────────────────────────────────────────────────
/**
 * Keyword + optional tag filter with cursor-based pagination.
 *
 * Keyword search uses Postgres ILIKE against title and description
 * (simple, no FTS setup required, fast enough for an MVP).
 *
 * Tag filter resolves the tag name → id first, then filters via
 * pin_tags to avoid a correlated sub-select.
 */
export async function searchPins(
  supabase: SupabaseClient,
  params: PinSearchParams
): Promise<QueryResult<DbPinWithRelations[]>> {
  const limit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
  const keyword = params.keyword?.trim() ?? ''
  const tagName = params.tag?.trim().toLowerCase() ?? ''

  try {
    // ── Resolve tag id if a tag filter was requested ──────────────────────
    let tagId: string | null = null

    if (tagName) {
      const { data: tagRow, error: tagError } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .maybeSingle()

      if (tagError) throw new Error('Tag lookup failed')

      // Tag doesn't exist → no results possible
      if (!tagRow) return { data: [], error: null }

      tagId = tagRow.id as string
    }

    // ── Base query ────────────────────────────────────────────────────────
    let query = supabase
      .from('pins')
      .select(PIN_SELECT)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Cursor
    if (params.cursor) {
      query = query.lt('created_at', params.cursor)
    }

    // Keyword — search title OR description with ILIKE
    if (keyword) {
      query = query.or(
        `title.ilike.%${keyword}%,description.ilike.%${keyword}%`
      )
    }

    // Tag — filter via pin_tags foreign table
    if (tagId) {
      query = query.eq('pin_tags.tag_id', tagId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    const rows = (data ?? []) as unknown as Record<string, unknown>[]

    // When filtering by tag we need to post-filter: because pin_tags is a
    // joined table, Supabase doesn't restrict the parent row — it only
    // filters which nested pin_tags rows come back. We keep only pins that
    // actually have at least one pin_tag row matching the requested tag.
    const filtered = tagId
      ? rows.filter((row) => {
          const pts = Array.isArray(row.pin_tags) ? row.pin_tags : []
          return pts.some((pt: unknown) => {
            const p = pt as Record<string, unknown>
            return p.tag_id === tagId
          })
        })
      : rows

    return { data: filtered.map(normalisePin), error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Search failed',
    }
  }
}

// ── getPopularTags ─────────────────────────────────────────────────────────
/**
 * Returns the N most-used tags by counting pin_tags rows.
 * Used to populate the tag filter suggestions on the search page.
 */
export async function getPopularTags(
  supabase: SupabaseClient,
  limit = 30
): Promise<QueryResult<(DbTag & { count: number })[]>> {
  try {
    // Supabase doesn't support GROUP BY via the JS client so we use a raw
    // count approach: fetch all pin_tag rows joined with tags, then
    // aggregate client-side.  For an MVP the tag count is small enough.
    const { data, error } = await supabase
      .from('pin_tags')
      .select('tags ( id, name )')
      .limit(2000) // safety cap

    if (error) throw new Error(error.message)

    const countMap = new Map<string, { tag: DbTag; count: number }>()

    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const t = row.tags as Record<string, unknown> | null
      if (!t || typeof t.id !== 'string' || typeof t.name !== 'string') continue
      const existing = countMap.get(t.id)
      if (existing) {
        existing.count += 1
      } else {
        countMap.set(t.id, { tag: { id: t.id, name: t.name }, count: 1 })
      }
    }

    const sorted = [...countMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(({ tag, count }) => ({ ...tag, count }))

    return { data: sorted, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load tags',
    }
  }
}

// ── getPinById ────────────────────────────────────────────────────────────────

export async function getPinById(
  supabase: SupabaseClient,
  id: string
): Promise<QueryResult<DbPinWithRelations>> {
  try {
    const { data, error } = await supabase
      .from('pins')
      .select(PIN_SELECT)
      .eq('id', id)
      .eq('is_published', true)
      .single()

    if (error || !data) return { data: null, error: 'Pin not found' }

    return { data: normalisePin(data as unknown as Record<string, unknown>), error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load pin',
    }
  }
}

// ── getProfilePins ────────────────────────────────────────────────────────────

export async function getProfilePins(
  supabase: SupabaseClient,
  ownerId: string,
  cursor?: string | null,
  limit = DEFAULT_LIMIT
): Promise<QueryResult<DbPinWithRelations[]>> {
  try {
    let query = supabase
      .from('pins')
      .select(PIN_SELECT)
      .eq('owner_id', ownerId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, MAX_LIMIT))

    if (cursor) query = query.lt('created_at', cursor)

    const { data, error } = await query

    if (error) throw new Error(error.message)

    return {
      data: ((data ?? []) as unknown as Record<string, unknown>[]).map(normalisePin),
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load pins',
    }
  }
}