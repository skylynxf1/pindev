import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/pins/likes?ids=id1,id2,...
// Returns { [pinId]: { likeCount: number, likedByMe: boolean } }
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get('ids') ?? ''
  const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean)

  if (ids.length === 0) return NextResponse.json({})

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Single query for all pin ids
  const { data: likes } = await supabase
    .from('pin_likes')
    .select('pin_id, user_id')
    .in('pin_id', ids)

  const result: Record<string, { likeCount: number; likedByMe: boolean }> = {}
  for (const id of ids) result[id] = { likeCount: 0, likedByMe: false }

  for (const row of likes ?? []) {
    if (result[row.pin_id]) {
      result[row.pin_id].likeCount++
      if (user && row.user_id === user.id) result[row.pin_id].likedByMe = true
    }
  }

  return NextResponse.json(result)
}
