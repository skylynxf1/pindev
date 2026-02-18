import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchPins } from '@/lib/db/queries'

/**
 * GET /api/search/pins
 * Query params: q, tag, cursor, limit
 * Public — no auth required.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const keyword = searchParams.get('q') ?? ''
  const tag     = searchParams.get('tag') ?? ''
  const cursor  = searchParams.get('cursor') ?? null
  const limit   = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 50)

  const supabase = await createClient()

  const result = await searchPins(supabase, { keyword, tag, cursor, limit })

  if (result.error) {
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 })
  }

  return NextResponse.json({ pins: result.data })
}