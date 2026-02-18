import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPopularTags } from '@/lib/db/queries'

/**
 * GET /api/tags
 * Returns the most-used tags for search page suggestions.
 * Public endpoint — no auth required.
 */
export async function GET() {
  const supabase = await createClient()

  const result = await getPopularTags(supabase, 40)

  if (result.error) {
    return NextResponse.json({ error: 'Failed to load tags.' }, { status: 500 })
  }

  return NextResponse.json({ tags: result.data })
}