import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchPins } from '@/lib/db/queries'
import type { DbPinWithRelations } from '@/lib/db/types'

// ── Relevance scoring ─────────────────────────────────────────────────────────

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 0)
}

function scorePin(
  pin: DbPinWithRelations,
  queryLower: string,
  tokens: string[],
): number {
  let score = 0
  const title = (pin.title || '').toLowerCase()
  const desc = (pin.description || '').toLowerCase()
  const tagNames = (pin.tags || []).map(t => t.name.toLowerCase())

  // Full query exact match in title (highest signal)
  if (title === queryLower) score += 15
  // Full query contained in title
  else if (title.includes(queryLower)) score += 10

  for (const token of tokens) {
    // Token in title
    if (title.includes(token)) score += 6
    // Token matches a tag exactly
    if (tagNames.some(t => t === token)) score += 5
    // Token partially matches a tag
    else if (tagNames.some(t => t.includes(token))) score += 3
    // Token in description
    if (desc.includes(token)) score += 2
  }

  // Recency boost (max 0.5 for today, decays over 1 year)
  const ageDays =
    (Date.now() - new Date(pin.created_at).getTime()) / 86_400_000
  score += Math.max(0, 1 - ageDays / 365) * 0.5

  return score
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

  // ── Keyword present → ranked search ─────────────────────────────────────
  if (keyword.trim()) {
    // Fetch a large candidate set for scoring (up to 200)
    const result = await searchPins(supabase, {
      keyword,
      tag,
      limit: 200,
    })

    if (result.error) {
      return NextResponse.json({ error: 'Search failed.' }, { status: 500 })
    }

    const candidates = result.data ?? []
    const queryLower = keyword.trim().toLowerCase()
    const tokens = tokenize(keyword)

    // Score and sort by relevance
    const scored = candidates
      .map(pin => ({ pin, score: scorePin(pin, queryLower, tokens) }))
      .sort((a, b) => b.score - a.score)

    const page = scored.slice(offset, offset + limit).map(s => s.pin)

    return NextResponse.json({
      pins: page,
      hasMore: offset + limit < scored.length,
    })
  }

  // ── No keyword → newest first with offset pagination ────────────────────
  const result = await searchPins(supabase, { tag, limit: limit + 1, offset })

  if (result.error) {
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 })
  }

  const rows = result.data ?? []
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return NextResponse.json({ pins: page, hasMore })
}
