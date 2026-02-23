import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function ok(data: object) {
  return NextResponse.json(data)
}
function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

// GET /api/pins/[id]/like -> { likeCount, likedByMe }
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { count } = await supabase
    .from('pin_likes')
    .select('*', { count: 'exact', head: true })
    .eq('pin_id', id)

  let likedByMe = false
  if (user) {
    const { data } = await supabase
      .from('pin_likes')
      .select('id')
      .eq('pin_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    likedByMe = !!data
  }

  return ok({ likeCount: count ?? 0, likedByMe })
}

// POST /api/pins/[id]/like -> like the pin (idempotent)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('Unauthorized', 401)

  const { data: pin } = await supabase
    .from('pins')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (!pin) return err('Pin not found', 404)

  const { error } = await supabase
    .from('pin_likes')
    .insert({ pin_id: id, user_id: user.id })

  // 23505 = unique_violation: already liked — treat as success
  if (error && error.code !== '23505') {
    return err('Failed to like', 500)
  }

  return ok({ success: true })
}

// DELETE /api/pins/[id]/like -> unlike the pin (idempotent)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('Unauthorized', 401)

  const { error } = await supabase
    .from('pin_likes')
    .delete()
    .eq('pin_id', id)
    .eq('user_id', user.id)

  if (error) return err('Failed to unlike', 500)

  return ok({ success: true })
}
