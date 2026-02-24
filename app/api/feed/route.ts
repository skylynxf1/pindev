import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Tag } from '@/types'

// Max pins to pull into the scoring pool. Fine for MVPs up to ~1 000 pins.
const POOL_SIZE = 500

// ── Shared selects ────────────────────────────────────────────────────────────

const BASE_SELECT = `
  id, owner_id, title, description, live_url, repo_url,
  media_url, media_type, thumbnail_url, is_published,
  sort_index, featured_until, created_at, updated_at,
  profiles ( username, display_name, avatar_url ),
  pin_tags ( tags ( id, name ) )
`.trim()

const RANKED_SELECT = `
  id, owner_id, title, description, live_url, repo_url,
  media_url, media_type, thumbnail_url, is_published,
  sort_index, featured_until, created_at, updated_at,
  likes_count, clicks_count, impressions_count, has_video,
  admin_pinned_position, admin_pinned_until,
  profiles ( username, display_name, avatar_url ),
  pin_tags ( tags ( id, name ) )
`.trim()

// ── Ranking formula ───────────────────────────────────────────────────────────

interface RankingFields {
  likes_count: number
  clicks_count: number
  impressions_count: number
  has_video: boolean
  created_at: string
}

function computeScore(pin: RankingFields): number {
  const ageHours =
    (Date.now() - new Date(pin.created_at).getTime()) / (1000 * 60 * 60)

  const imp = pin.impressions_count + 30
  const likeRate  = pin.likes_count  / imp
  const clickRate = pin.clicks_count / imp
  const quality   = 0.70 * likeRate + 0.30 * clickRate

  const decay           = Math.exp(-ageHours / 96)
  const videoMult       = pin.has_video ? 1.12 : 1.0
  const explorationMult = 1 + Math.max(0, Math.min((500 - pin.impressions_count) / 500, 1)) * 0.15

  return (quality * 100) * decay * videoMult * explorationMult
}

// ── Row normaliser ────────────────────────────────────────────────────────────

function normalise(row: Record<string, unknown>) {
  const rawProfile = row.profiles
  const profile = Array.isArray(rawProfile)
    ? (rawProfile[0] ?? null)
    : (rawProfile ?? null)

  const rawPinTags = Array.isArray(row.pin_tags) ? row.pin_tags : []
  const tags: Tag[] = rawPinTags
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
    .filter((t): t is Tag => t !== null)

  return {
    id:                    row.id as string,
    owner_id:              row.owner_id as string,
    title:                 row.title as string,
    description:           row.description as string,
    live_url:              row.live_url as string,
    repo_url:              (row.repo_url as string | null) ?? null,
    media_url:             row.media_url as string,
    media_type:            row.media_type as 'image' | 'video',
    thumbnail_url:         row.thumbnail_url as string,
    is_published:          row.is_published as boolean,
    sort_index:            (row.sort_index as number | null) ?? null,
    featured_until:        (row.featured_until as string | null) ?? null,
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

// ── GET /api/feed?offset=0&limit=40 ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10))
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '40', 10)))

  try {
    // Use server client with anon key — published pins are publicly readable.
    const supabase = await createClient()

    // ── Attempt ranked query (requires 0006_ranking migration) ───────────
    let rows: Record<string, unknown>[] = []
    let hasRankingCols = false

    const ranked = await supabase
      .from('pins')
      .select(RANKED_SELECT)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(POOL_SIZE)

    if (!ranked.error) {
      rows = (ranked.data ?? []) as unknown as Record<string, unknown>[]
      hasRankingCols = true
    } else {
      // Migration not run yet — fall back to the same ordering usePins uses.
      const basic = await supabase
        .from('pins')
        .select(BASE_SELECT)
        .eq('is_published', true)
        .order('sort_index', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: false })
        .limit(POOL_SIZE)

      if (basic.error) throw new Error(basic.error.message)
      rows = (basic.data ?? []) as unknown as Record<string, unknown>[]
    }

    // ── Score & sort (skipped when ranking cols unavailable) ──────────────
    const now = new Date()

    if (hasRankingCols) {
      const adminPinned: Array<{ pos: number; row: Record<string, unknown> }> = []
      const regular:     Array<{ score: number; row: Record<string, unknown> }> = []

      for (const row of rows) {
        const pinnedUntil = row.admin_pinned_until
          ? new Date(row.admin_pinned_until as string)
          : null

        if (
          row.admin_pinned_position != null &&
          pinnedUntil != null &&
          pinnedUntil > now
        ) {
          adminPinned.push({ pos: row.admin_pinned_position as number, row })
        } else {
          regular.push({
            score: computeScore({
              likes_count:       (row.likes_count       as number) ?? 0,
              clicks_count:      (row.clicks_count      as number) ?? 0,
              impressions_count: (row.impressions_count as number) ?? 0,
              has_video:         (row.has_video         as boolean) ?? false,
              created_at:        row.created_at as string,
            }),
            row,
          })
        }
      }

      regular.sort((a, b) => b.score - a.score)
      rows = regular.map(r => r.row)

      // Inject admin-pinned at their 1-indexed positions
      adminPinned.sort((a, b) => a.pos - b.pos)
      for (const { pos, row } of adminPinned) {
        rows.splice(Math.max(0, pos - 1), 0, row)
      }
    }

    // ── Paginate & return ─────────────────────────────────────────────────
    const page    = rows.slice(offset, offset + limit)
    const hasMore = offset + limit < rows.length

    return NextResponse.json({
      pins:    page.map(normalise),
      hasMore,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Feed load failed' },
      { status: 500 }
    )
  }
}
