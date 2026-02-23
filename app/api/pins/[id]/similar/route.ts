import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSimilarPins } from '@/lib/db/queries'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const url = new URL(req.url)

  // Accept tag names so we skip a redundant pin re-fetch
  const tagsParam = url.searchParams.get('tags') ?? ''
  const tagNames = tagsParam ? tagsParam.split(',').filter(Boolean) : []

  // Pagination: cursor = created_at of last loaded pin
  const cursor = url.searchParams.get('cursor') ?? undefined
  const limit = Math.min(
    parseInt(url.searchParams.get('limit') ?? '20', 10) || 20,
    50,
  )

  const supabase = await createClient()
  const { data, error } = await getSimilarPins(
    supabase,
    id,
    tagNames,
    limit,
    cursor,
  )

  if (error) return NextResponse.json({ error }, { status: 500 })

  const pins = data ?? []

  // Batch-fetch likes in the same response so PinCards don't each self-fetch
  const likes: Record<string, { likeCount: number; likedByMe: boolean }> = {}

  if (pins.length > 0) {
    const pinIds = pins.map((p) => p.id)

    // Run auth check + likes query in parallel
    const [{ data: { user } }, { data: likeRows }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('pin_likes')
        .select('pin_id, user_id')
        .in('pin_id', pinIds),
    ])

    for (const pid of pinIds) likes[pid] = { likeCount: 0, likedByMe: false }
    for (const row of (likeRows ?? []) as Array<{ pin_id: string; user_id: string }>) {
      if (likes[row.pin_id]) {
        likes[row.pin_id].likeCount++
        if (user && row.user_id === user.id) likes[row.pin_id].likedByMe = true
      }
    }
  }

  return NextResponse.json({ pins, likes })
}
