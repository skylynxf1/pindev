import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

const patchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Board name is required')
    .max(80, 'Board name must be 80 characters or fewer')
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or fewer')
    .optional(),
})

interface Props {
  params: Promise<{ id: string }>
}

// ── PATCH /api/boards/[id]  — rename / update a board ─────────────────────────
export async function PATCH(request: NextRequest, { params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return errorResponse('Unauthorized', 401)

  let body: unknown
  try { body = await request.json() } catch { return errorResponse('Invalid JSON body') }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')
  }

  const updates = parsed.data
  if (Object.keys(updates).length === 0) return errorResponse('No fields to update')

  const { data: board, error: updateError } = await supabase
    .from('boards')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', user.id)   // enforce ownership
    .select('id, name, description, is_private, created_at, updated_at')
    .single()

  if (updateError || !board) return errorResponse('Board not found or access denied.', 404)

  return NextResponse.json({ board })
}

// ── DELETE /api/boards/[id]  — delete a board and its board_pins ──────────────
export async function DELETE(_request: NextRequest, { params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return errorResponse('Unauthorized', 401)

  // Verify ownership before deleting
  const { data: board, error: fetchError } = await supabase
    .from('boards')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (fetchError || !board) return errorResponse('Board not found or access denied.', 404)

  // board_pins rows cascade-delete via FK, but explicitly delete just in case
  await supabase.from('board_pins').delete().eq('board_id', id)

  const { error: deleteError } = await supabase.from('boards').delete().eq('id', id)
  if (deleteError) return errorResponse('Failed to delete board.', 500)

  return NextResponse.json({ success: true })
}
