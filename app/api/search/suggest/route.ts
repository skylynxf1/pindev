import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/search/suggest?q=<query>
 *
 * Returns typeahead suggestions: tags, pin titles, and usernames
 * ranked by pg_trgm similarity. Fast — targets <100ms.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()

  if (q.length < 1) {
    return NextResponse.json({ suggestions: [] })
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('search_suggestions', {
    query_text: q,
    max_results: 6,
  })

  if (error) {
    console.error('search_suggestions RPC error:', error)
    return NextResponse.json({ suggestions: [] })
  }

  type RpcRow = {
    suggestion_type: string
    suggestion_text: string
    similarity_score: number
    extra_id: string
  }

  const rows = (data ?? []) as RpcRow[]

  // Deduplicate by text (case-insensitive) and cap at 8 total
  const seen = new Set<string>()
  const suggestions: { type: string; text: string; id: string }[] = []

  for (const row of rows) {
    const key = row.suggestion_text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    suggestions.push({
      type: row.suggestion_type,
      text: row.suggestion_text,
      id: row.extra_id,
    })
    if (suggestions.length >= 8) break
  }

  return NextResponse.json({ suggestions })
}
