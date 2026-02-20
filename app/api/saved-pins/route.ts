import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Pin, Tag } from '@/types'

// ── POST /api/saved-pins  — quick-save to the user's default "Saved" board ───
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = z.object({ pin_id: z.string().uuid() }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid pin_id' }, { status: 400 })

  const { pin_id } = parsed.data

  // Find or create the user's default "Saved" board
  let boardId: string
  const { data: existing } = await supabase
    .from('boards')
    .select('id')
    .eq('owner_id', user.id)
    .eq('name', 'Saved')
    .maybeSingle()

  if (existing) {
    boardId = existing.id
  } else {
    const { data: newBoard, error: createError } = await supabase
      .from('boards')
      .insert({ owner_id: user.id, name: 'Saved', is_private: false })
      .select('id')
      .single()
    if (createError || !newBoard) {
      console.error('[api/saved-pins] board create error:', createError)
      return NextResponse.json({ error: 'Failed to create board' }, { status: 500 })
    }
    boardId = newBoard.id
  }

  const { error: insertError } = await supabase
    .from('board_pins')
    .upsert({ board_id: boardId, pin_id }, { onConflict: 'board_id,pin_id', ignoreDuplicates: true })

  if (insertError) {
    console.error('[api/saved-pins] insert error:', insertError)
    return NextResponse.json({ error: 'Failed to save pin' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all board IDs owned by this user
  const { data: boards } = await supabase
    .from('boards')
    .select('id')
    .eq('owner_id', user.id)

  if (!boards || boards.length === 0) {
    return NextResponse.json({ pins: [] })
  }

  const boardIds = boards.map((b) => b.id)

  // Get board_pins with full pin details
  const { data: boardPins, error } = await supabase
    .from('board_pins')
    .select(`
      pin_id,
      saved_at,
      pins (
        id, owner_id, title, description, live_url, repo_url,
        media_url, media_type, thumbnail_url, is_published,
        created_at, updated_at,
        profiles ( username, display_name, avatar_url ),
        pin_tags ( tags ( id, name ) )
      )
    `)
    .in('board_id', boardIds)
    .order('saved_at', { ascending: false })

  if (error || !boardPins) {
    console.error('[api/saved-pins]', error?.message)
    return NextResponse.json({ pins: [] })
  }

  // Deduplicate — a pin might be in multiple boards
  const seen = new Set<string>()
  const pins: Pin[] = []

  for (const bp of boardPins) {
    const row = bp.pins as unknown as Record<string, unknown> | null
    if (!row) continue
    const pinId = row.id as string
    if (seen.has(pinId)) continue
    seen.add(pinId)

    pins.push({
      id: pinId,
      owner_id: row.owner_id as string,
      title: row.title as string,
      description: row.description as string,
      live_url: row.live_url as string,
      repo_url: row.repo_url as string | null,
      media_url: row.media_url as string,
      media_type: row.media_type as 'image' | 'video',
      thumbnail_url: row.thumbnail_url as string,
      is_published: row.is_published as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      profile: Array.isArray(row.profiles)
        ? (row.profiles[0] ?? null)
        : (row.profiles as Pin['profile'] ?? null),
      tags: Array.isArray(row.pin_tags)
        ? (row.pin_tags as Array<{ tags: Tag }>).map((pt) => pt.tags).filter(Boolean)
        : [],
    })
  }

  return NextResponse.json({ pins })
}
