import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

const savePinSchema = z.object({
  board_id: z.string().uuid('Invalid board ID'),
  pin_id: z.string().uuid('Invalid pin ID'),
})

const removePinSchema = z.object({
  board_id: z.string().uuid('Invalid board ID'),
  pin_id: z.string().uuid('Invalid pin ID'),
})

// ── POST /api/board-pins  — save a pin to a board ─────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return errorResponse('Unauthorized', 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  const parsed = savePinSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return errorResponse(first?.message ?? 'Invalid input')
  }

  const { board_id, pin_id } = parsed.data

  // Verify the board belongs to the requesting user before inserting.
  // RLS enforces this too but we give a clear error message here.
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('id')
    .eq('id', board_id)
    .eq('owner_id', user.id)
    .single()

  if (boardError || !board) {
    return errorResponse('Board not found or access denied.', 403)
  }

  // Verify the pin exists and is published (or owned by the user)
  const { data: pin, error: pinError } = await supabase
    .from('pins')
    .select('id')
    .eq('id', pin_id)
    .or(`is_published.eq.true,owner_id.eq.${user.id}`)
    .single()

  if (pinError || !pin) {
    return errorResponse('Pin not found.', 404)
  }

  const { error: insertError } = await supabase
    .from('board_pins')
    .upsert({ board_id, pin_id }, { onConflict: 'board_id,pin_id', ignoreDuplicates: true })

  if (insertError) {
    return errorResponse('Failed to save pin to board.', 500)
  }

  return NextResponse.json({ success: true }, { status: 201 })
}

// ── DELETE /api/board-pins  — remove a pin from a board ──────────────────────
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return errorResponse('Unauthorized', 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  const parsed = removePinSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return errorResponse(first?.message ?? 'Invalid input')
  }

  const { board_id, pin_id } = parsed.data

  // Verify board ownership before deleting
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('id')
    .eq('id', board_id)
    .eq('owner_id', user.id)
    .single()

  if (boardError || !board) {
    return errorResponse('Board not found or access denied.', 403)
  }

  const { error: deleteError } = await supabase
    .from('board_pins')
    .delete()
    .eq('board_id', board_id)
    .eq('pin_id', pin_id)

  if (deleteError) {
    return errorResponse('Failed to remove pin from board.', 500)
  }

  return NextResponse.json({ success: true })
}